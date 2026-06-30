(function () {
  "use strict";

  if (window.injectedWeb3?.["xterium"]) {
    return;
  }

  if (!window.injectedWeb3) {
    window.injectedWeb3 = {};
  }

  function generateMessageId() {
    return `xterium-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function postAndListen(data) {
    return new Promise((resolve, reject) => {
      const messageId = generateMessageId();

      const messageHandler = (event) => {
        if (!event || event.source !== window) return;
        if (!event.data || typeof event.data !== "object") return;

        if (
          event.data.id === messageId &&
          event.data.source === "xterium-extension" &&
          event.data.type === "response" &&
          event.data.method === data.method
        ) {
          window.removeEventListener("message", messageHandler);

          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.response);
          }
        }
      };

      window.addEventListener("message", messageHandler);

      window.postMessage(
        {
          id: messageId,
          source: "xterium-extension",
          type: "request",
          method: data.method,
          payload: data.payload,
        },
        "*",
      );

      setTimeout(() => {
        window.removeEventListener("message", messageHandler);
        reject(new Error(`[Xterium] Timeout waiting for ${data.method}`));
      }, 30000);
    });
  }

  window.injectedWeb3["xterium"] = {
    version: "2.7.0",
    enable: async (origin) => {
      try {
        await postAndListen({
          method: "request-web3-connection",
          payload: {
            origin: origin,
          },
        });

        return {
          accounts: {
            get: async () => {
              const accounts = await postAndListen({
                method: "get-web3-accounts",
              });

              return accounts || [];
            },
            subscribe: (cb) => {
              // TODO: Implement subscription
              return () => {};
            },
          },
          signer: {
            signPayload: async (payload) => {
              const signature = await postAndListen({
                method: "sign-payload",
                payload: payload,
              });

              return signature;
            },
            signRaw: async ({ address, data, type }) => {
              const signature = await postAndListen({
                method: "sign-raw",
                payload: {
                  address: address,
                  data: data,
                  type: type,
                },
              });

              return signature;
            },
          },
          metadata: {
            get: async () => [],
            provide: async () => true,
          },
        };
      } catch (error) {
        throw error;
      }
    },
  };

  window.dispatchEvent(
    new CustomEvent("xterium#initialized", {
      detail: { version: "2.7.0" },
    }),
  );
})();
