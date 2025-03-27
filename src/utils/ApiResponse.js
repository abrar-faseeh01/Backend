class ApiResponse {
    constructor(statusCode,data,message="Success"){
        this.statusCode=statusCode
        this.data=data
        this.message=message
        this.success=statusCode<400 // Sets success to true if statusCode is below 400 (indicating a successful response), otherwise false for errors (400+ status codes).
    }
}

export { ApiResponse }
