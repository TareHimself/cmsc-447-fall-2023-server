
export function builResponse<T extends boolean>(data: T extends true ? string : unknown, error: T) {
    if (error) {
        return {
            data: null,
            error: data
        }
    }
    else {
        return {
            data: data,
            error: null
        }
    }
}

export function dateToNumber(date: Date) {
    return parseInt(`${date.getUTCFullYear()}${date.getUTCMonth().toString().padStart(2, "0")}${date.getUTCDay().toString().padStart(2, "0")}${date.getUTCHours().toString().padStart(2, "0")}${date.getUTCMinutes().toString().padStart(2, "0")}${date.getUTCSeconds().toString().padStart(2, "0")}`)
}