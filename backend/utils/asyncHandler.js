const asyncHandler = (requestHandler) => (req, res, next) => {
  Promise.resolve()
    .then(() => requestHandler(req, res, next))
    .catch(next);
};

export { asyncHandler };
