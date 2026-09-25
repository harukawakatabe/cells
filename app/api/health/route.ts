export async function GET() {
  return Response.json(
    {
      status: "ok",
      service: "cells",
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
