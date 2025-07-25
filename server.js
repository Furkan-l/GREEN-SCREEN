const express = require('express');
const fetch = require('node-fetch');
const xml2js = require('xml2js');
const cors = require('cors');

const app = express();
app.use(cors());

const RSS_SOURCES = [
  { name: 'Beyazperde', url: 'https://www.beyazperde.com/rss/news.xml' },
  { name: 'Box Office Türkiye', url: 'https://boxofficeturkiye.com/rss/haberler.xml' },
  { name: 'Ranini.tv', url: 'https://www.ranini.tv/rss/haber' }
];

app.get('/api/news', async (req, res) => {
  const allNews = [];
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3*24*60*60*1000);

  await Promise.all(RSS_SOURCES.map(async (src) => {
    try {
      const response = await fetch(src.url);
      const xml = await response.text();
      const result = await xml2js.parseStringPromise(xml, { mergeAttrs: true, explicitArray: false });
      const items = result.rss.channel.item;
      if (!items) return;
      (Array.isArray(items) ? items : [items]).forEach(item => {
        const pubDate = new Date(item.pubDate);
        if (pubDate >= threeDaysAgo && pubDate <= now) {
          // Görseli bul
          let thumbnail = '';
          if (item['media:thumbnail'] && item['media:thumbnail'].url) {
            thumbnail = item['media:thumbnail'].url;
          } else if (item.enclosure && item.enclosure.url) {
            thumbnail = item.enclosure.url;
          } else if (item.description) {
            const imgMatch = item.description.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (imgMatch) thumbnail = imgMatch[1];
          }
          allNews.push({
            title: item.title,
            link: item.link,
            description: item.description.replace(/<[^>]+>/g, '').slice(0, 180) + '...',
            pubDate: item.pubDate,
            thumbnail,
            source: src.name
          });
        }
      });
    } catch (e) {}
  }));

  // Tarihe göre sırala ve ilk 9 haberi gönder
  allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  res.json(allNews.slice(0, 9));
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 