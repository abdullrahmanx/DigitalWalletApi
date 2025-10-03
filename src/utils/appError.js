class AppError extends Error {
    constructor(statusCode,status,message){
        super();
        this.status=status;
        this.statusCode=statusCode;
        this.message=message;

    }
}


module.exports= AppError;
