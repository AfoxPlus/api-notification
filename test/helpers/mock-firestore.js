function createMockFirestore(initialDocuments = {}) {
  const documents = new Map(
    Object.entries(initialDocuments).map(([path, data]) => [path, structuredClone(data)]),
  );

  function documentReference(path) {
    return {
      path,
      async get() {
        return snapshot(path);
      },
    };
  }

  function snapshot(path) {
    const value = documents.get(path);
    return {
      exists: value !== undefined,
      data: () => (value === undefined ? undefined : structuredClone(value)),
    };
  }

  function transaction() {
    return {
      async get(reference) {
        return snapshot(reference.path);
      },
      set(reference, value, options) {
        const current = documents.get(reference.path);
        documents.set(
          reference.path,
          structuredClone(options?.merge && current ? { ...current, ...value } : value),
        );
      },
      update(reference, value) {
        const current = documents.get(reference.path);

        if (!current) {
          throw new Error(`Missing document: ${reference.path}`);
        }

        documents.set(reference.path, structuredClone({ ...current, ...value }));
      },
      delete(reference) {
        documents.delete(reference.path);
      },
    };
  }

  function query(name, predicate, limitCount) {
    return {
      limit(count) {
        return query(name, predicate, count);
      },
      async get() {
        const prefix = `${name}/`;
        const docs = [...documents.entries()]
          .filter(([path]) => path.startsWith(prefix))
          .map(([path, value]) => ({ id: path.slice(prefix.length), data: () => structuredClone(value) }))
          .filter((doc) => predicate(doc.data()))
          .slice(0, limitCount ?? Infinity);

        return { empty: docs.length === 0, docs };
      },
    };
  }

  return {
    collection(name) {
      return {
        doc(id) {
          return documentReference(`${name}/${id}`);
        },
        where(field, op, value) {
          if (op !== "==") {
            throw new Error(`Unsupported operator: ${op}`);
          }

          return query(name, (data) => data[field] === value);
        },
      };
    },
    async runTransaction(callback) {
      return callback(transaction());
    },
    get(path) {
      return documents.get(path);
    },
  };
}

module.exports = { createMockFirestore };

