function closedError() {
  const error = new Error('application is closed');
  error.code = 'APPLICATION_CLOSED';
  return error;
}

export function createApplication() {
  let closed = false;
  return {
    async claim() {
      if (closed) throw closedError();
      return { claimedWorkId: '8001' };
    },
    async close() { closed = true; },
  };
}
