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

  return {
    collection(name) {
      return {
        doc(id) {
          return documentReference(`${name}/${id}`);
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

