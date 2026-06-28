export default async function handler(req, res) {
  const { gid } = req.query;
  const scriptUrl = process.env.APPS_SCRIPT_URL;

  if (!scriptUrl) {
    return res.status(500).json({ error: 'APPS_SCRIPT_URL environment variable is not set' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  try {
    const url = `${scriptUrl}${gid ? `?gid=${encodeURIComponent(gid)}` : ''}`;

    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Apps Script returned ${response.status}` });
    }

    const text = await response.text();

    if (text.trim().startsWith('{') && text.includes('"error"')) {
      return res.status(502).json({ error: 'Apps Script error', detail: text.slice(0, 300) });
    }

    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      return res.status(502).json({
        error: 'Apps Script returned HTML — check it is deployed and the URL is correct',
        preview: text.slice(0, 200),
      });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.send(text);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
