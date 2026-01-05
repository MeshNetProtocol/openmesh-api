/**
 * OpenMesh API - Universal Links Support (AASA)
 *
 * Must be served over HTTPS with no redirects:
 *  - https://<domain>/.well-known/apple-app-site-association
 *  - https://<domain>/apple-app-site-association
 *
 * Apple doc: appID = TEAM_ID + "." + BUNDLE_ID, and applinks.apps must be [].
 */

interface Env {
    IOS_TEAM_ID?: string;      // e.g. "9JA89QQLNQ"
    IOS_BUNDLE_ID?: string;    // e.g. "com.MeshNetProtocol.OpenMesh.OpenMesh"
    UL_PATHS?: string;         // comma-separated, e.g. "/callback,/wsegue"
}

function normalizePaths(paths: string[]): string[] {
    const out: string[] = [];
    for (const p of paths) {
        if (!p) continue;
        let s = p.trim();
        if (!s.startsWith("/")) s = "/" + s;
        // remove trailing spaces only; keep trailing slash if user wants
        out.push(s);
    }
    return Array.from(new Set(out));
}

function buildAASA(env: Env) {
    const teamId = (env.IOS_TEAM_ID || "TEAMID").trim();
    const bundleId = (env.IOS_BUNDLE_ID || "com.MeshNetProtocol.OpenMesh.OpenMesh").trim();
    const appID = `${teamId}.${bundleId}`;

    const rawPaths = (env.UL_PATHS || "/callback").split(",").map(s => s.trim()).filter(Boolean);
    const basePaths = normalizePaths(rawPaths);

    // For each base path, allow exact + wildcard under it
    const paths: string[] = [];
    for (const bp of basePaths) {
        paths.push(bp);
        // If user passes "/", avoid "//*"
        if (bp !== "/") {
            paths.push(`${bp}*`);
            paths.push(bp.endsWith("/") ? `${bp}*` : `${bp}/*`);
        } else {
            paths.push("/*");
        }
    }

    return {
        applinks: {
            apps: [],
            details: [
                {
                    appID,
                    paths,
                },
            ],
        },
        // Optional: only needed if you actually use Shared Web Credentials / AutoFill.
        // Keeping it doesn't hurt.
        webcredentials: {
            apps: [appID],
        },
    };
}

function json(resObj: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
    return new Response(JSON.stringify(resObj), {
        status,
        headers: {
            "Content-Type": "application/json",
            // Keep cache modest; Apple also caches on their side.
            "Cache-Control": "public, max-age=300",
            ...extraHeaders,
        },
    });
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                    "Access-Control-Max-Age": "86400",
                },
            });
        }

        // AASA endpoints
        if (
            request.method === "GET" &&
            (path === "/.well-known/apple-app-site-association" || path === "/apple-app-site-association")
        ) {
            const aasa = buildAASA(env);
            return json(aasa, 200, {
                // CORS not required for Apple, but harmless:
                "Access-Control-Allow-Origin": "*",
            });
        }

        // API routes
        if (path === "/api/health") {
            return json({
                status: "healthy",
                timestamp: new Date().toISOString(),
                aasa: "enabled",
            });
        }

        // Default
        return json(
            {
                service: "OpenMesh API",
                endpoints: {
                    "/.well-known/apple-app-site-association": "AASA",
                    "/apple-app-site-association": "AASA (alt)",
                    "/api/health": "health check",
                },
            },
            200
        );
    },
} satisfies ExportedHandler<Env>;
