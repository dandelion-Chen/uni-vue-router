export function parsePath(
    path: string = '',
): {
    path: string;
    query: string;
    hash: string;
} {
    let hash = '';
    let query = '';

    const hashIndex = path.indexOf('#');
    if (hashIndex >= 0) {
        hash = path.slice(hashIndex);
        path = path.slice(0, hashIndex);
    }

    const queryIndex = path.indexOf('?');
    if (queryIndex >= 0) {
        query = path.slice(queryIndex + 1);
        path = path.slice(0, queryIndex);
    }

    return {
        path,
        query,
        hash,
    };
}

export function addPrefixSlash(path: string): string {
    return path[0] !== '/' ? '/' + path : path;
}