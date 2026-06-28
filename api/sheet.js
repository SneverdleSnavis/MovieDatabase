export default async function handler(req, res) {
  const { gid } = req.query;
  const SHEET_ID = '1y_aLrrbqDBjZ9mDht1jBZN-sXGqq44Yxv3JDREhgdnA';

  const ALLOWED_GIDS = ['0']; // Add your sheet tab gids here
  if (!ALLOWED_GIDS.includes(gid)) {
    return res.status(400).json({ error: 'Unknown sheet' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;

    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!response.ok) {
      return res.status(502).json({
        error: `Google returned ${response.status}`,
        status: response.status,
        url,
      });
    }

    const text = await response.text();

    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      return res.status(502).json({
        error: 'Google returned HTML instead of CSV — sheet may not be public',
        preview: text.slice(0, 200),
      });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.send(text);
  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}
