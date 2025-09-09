const asyncHandler = (requestHandler) => {
	return (req, res, next) => {
		Promise
			.resolve(requestHandler(req, res, next))
			.catch((err) => next(err))
	}
}
export { asyncHandler };


// try catch wrapper for error detection
// export const asyncHndler = (fn) = async (req, res, next) => {
// 	try {
// 		await fn(req, res, next);
// 	} catch (error) {
// 		res.status(error.code || 500).json({
// 			sucess: false,
// 			message:err.message || "something gone wrong."
// 		})
// 	}
// }
