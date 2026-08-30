type QueryResult = { data: null; error: null; count: 0 };

function emptyResult(): QueryResult {
  return { data: null, error: null, count: 0 };
}

function createQueryBuilder() {
  const result = emptyResult();
  const builder: Record<string, unknown> = {};

  const chain = () => builder;
  const resolve = async () => result;

  const methods = [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "in",
    "is",
    "like",
    "ilike",
    "or",
    "filter",
    "match",
    "not",
    "order",
    "limit",
    "range",
    "single",
    "maybeSingle",
    "csv",
    "head",
    "contains",
    "containedBy",
    "textSearch",
    "returns",
  ];

  for (const method of methods) {
    builder[method] = chain;
  }

  builder.maybeSingle = resolve;
  builder.single = resolve;
  builder.then = (resolveThen: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolveThen, reject);

  return builder;
}

export function createDisconnectedClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: "Backend not connected yet" },
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: { message: "Backend not connected yet" },
      }),
      verifyOtp: async () => ({
        data: { user: null, session: null },
        error: { message: "Backend not connected yet" },
      }),
      resend: async () => ({
        data: {},
        error: { message: "Backend not connected yet" },
      }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({
        data: {},
        error: { message: "Backend not connected yet" },
      }),
      updateUser: async () => ({
        data: { user: null },
        error: { message: "Backend not connected yet" },
      }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe() {} } },
      }),
    },
    from() {
      return createQueryBuilder();
    },
    channel() {
      return {
        on() {
          return this;
        },
        subscribe() {
          return this;
        },
        unsubscribe() {
          return this;
        },
      };
    },
    removeChannel() {
      return Promise.resolve("ok");
    },
    rpc: async () => emptyResult(),
    storage: {
      from() {
        return {
          upload: async () => ({ data: null, error: { message: "Backend not connected yet" } }),
          getPublicUrl: () => ({ data: { publicUrl: "" } }),
        };
      },
    },
  };
}
