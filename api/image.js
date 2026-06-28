export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url parameter required' });

  let parsed;
  try {
    parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Only http/https URLs are allowed' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*,*/*' },
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Remote server returned ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) {
      return res.status(400).json({ error: 'URL does not point to an image' });
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 20 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image too large (max 20 MB)' });
    }

    res.setHeader('Content-Type', contentType.startsWith('image/') ? contentType : 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    return res.send(Buffer.from(buffer));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
