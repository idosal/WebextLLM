export function fetchRetry(url: string): Promise<Response> {
    return new Promise((resolve, reject) => {
        let retry = 0
        const retryFetch = () => {
            fetch(url).then(resolve).catch((e) => {
                retry++
                if (retry < 3) {
                    setTimeout(retryFetch, 1000)
                } else {
                    reject(e)
                }
            })
            }
            retryFetch()
    })

}