export function createPathClient() {
    const worker = new Worker(new URL('../../../workers/path.worker.ts', import.meta.url), { type: 'module' });
    const pending = new Map();
    let nextId = 1;
    worker.onmessage = (e) => {
        const p = pending.get(e.data.requestId);
        if (!p)
            return;
        pending.delete(e.data.requestId);
        p.resolve(e.data.ok ? e.data.nodes : new Int16Array(0));
    };
    worker.onerror = (e) => {
        for (const p of pending.values())
            p.reject(e);
        pending.clear();
    };
    return {
        request(req) {
            const requestId = nextId++;
            // Worker mutates incoming cost buffer view; send a copy to keep our grid intact.
            const copy = new Uint16Array(req.cost);
            return new Promise((resolve, reject) => {
                pending.set(requestId, {
                    resolve: (nodes) => resolve(nodes.length === 0 ? null : nodes),
                    reject,
                });
                worker.postMessage({ ...req, cost: copy, requestId }, [copy.buffer]);
            });
        },
        dispose() {
            worker.terminate();
            for (const p of pending.values())
                p.reject(new Error('PathClient disposed'));
            pending.clear();
        },
    };
}
