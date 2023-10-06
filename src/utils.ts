

export function builResponse<T extends boolean>(data: T extends true ? string : unknown, error: T){
    if(error){
        return {
            data: null,
            error: data
        }
    }
    else
    {
        return {
            data: data,
            error: null
        }
    }
}