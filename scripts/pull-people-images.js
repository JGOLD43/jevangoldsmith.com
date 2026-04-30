const fs = require('fs');
const path = require('path');

const peopleDir = path.join(process.cwd(), 'images', 'people');
fs.mkdirSync(peopleDir, { recursive: true });

const assets = {
  'andrew-wilkinson': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Andrew_Wilkinson_2015.jpg',
  'anne-lamott': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Anne_Lamott_at_San_Diego_Writers_Festival_2026.jpg',
  'atul-gawande': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Atul-Gawande_(cropped).jpg',
  'baltasar-gracian': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Baltasar_Graci%C3%A1n_Graus.jpg',
  'ben-horowitz': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/2024-07-21_Reuni%C3%A3o_de_Geraldo_Alckmin_com_Ben_Horowitz_01.jpg',
  'brendon-burchard': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Brendon_Burchard_at_Expert_Academy_2018.jpg',
  'cal-newport': 'https://calnewport.com/wp-content/uploads/2024/05/Home-header-1-2-1.jpg',
  'charles-darwin': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Charles_Darwin.jpg',
  'charlie-munger': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Charlie_Munger_(cropped).jpg',
  'daniel-kahneman': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Daniel_Kahneman_(3283955327).jpg',
  'david-goggins': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/DavidGogginsMay08.jpg',
  'david-ogilvy': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/David_ogilvy.jpg',
  'eckhart-tolle': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Eckhart_Tolle_front.jpg',
  'ed-catmull': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Ed_Catmull_at_Web_Summit_2015.jpg',
  'eric-ries': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Eric_Ries2.jpg',
  'james-dyson': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Sir_James_Dyson_CBE_FREng_FRS.jpg',
  'keith-j-cunningham': 'https://keystothevault.com/cdn/shop/files/large_15.webp',
  'nassim-nicholas-taleb': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Nassim_Nicholas_Taleb_2013.jpg',
  'phil-knight': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Philknightfootball.jpg',
  'rob-fitzpatrick': 'https://www.momtestbook.com/rob.jpg',
  'robert-cialdini': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Robert_Cialdini.jpg',
  'rolf-dobelli': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Rolf_Dobelli_Ausschnitt.jpg',
  'shane-parrish': 'https://fs.blog/wp-content/uploads/2023/04/shane_0010-scaled.jpg',
  'sherlock-holmes': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Sherlock_Holmes_Portrait_Paget.jpg',
  'spencer-johnson': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Spencer_Johnson.png',
  'victor-o-schwab': 'https://www.scientificadvertising.com/wp-content/uploads/2017/03/Vic-Schwab-269x300-269x300.jpg',
  'will-durant': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Will_Durant.jpg',
  'william-macaskill': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/William_MacAskill_Portrait_2015_(cropped).jpg',
  'yuval-noah-harari': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Yuval_Noah_Harari_photo.jpg'
};

async function download(slug, url) {
  const target = path.join(peopleDir, `${slug}.jpg`);
  if (fs.existsSync(target) && fs.statSync(target).size > 1024) return 'exists';
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X) JevanGoldsmithWebsite/1.0' }
  });
  if (!response.ok) return `${response.status}`;
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1024 || buffer.includes(Buffer.from('<html'))) return 'not-image';
  fs.writeFileSync(target, buffer);
  return 'pulled';
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const results = [];
  for (const [slug, url] of Object.entries(assets)) {
    results.push(`${slug}: ${await download(slug, url)}`);
    await wait(3500);
  }
  console.log(results.join('\n'));
})();
