const fs = require('fs');
const path = require('path');

const peopleDir = path.join(process.cwd(), 'images', 'people');
fs.mkdirSync(peopleDir, { recursive: true });

const assets = {
  'a-s-neill': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Neill_birthday_%28cropped%29.jpg?width=500',
  'andrew-wilkinson': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Andrew_Wilkinson_2015.jpg',
  'andrew-grove': 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Intel_Inside_%283607903903%29_%28cropped%29.jpg',
  'anne-lamott': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Anne_Lamott_at_San_Diego_Writers_Festival_2026.jpg',
  'arnold-schwarzenegger': 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Arnold_Schwarzenegger_2019_%28rotated-cropped%29.jpg',
  'atul-gawande': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Atul-Gawande_(cropped).jpg',
  'baltasar-gracian': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Baltasar_Graci%C3%A1n_Graus.jpg',
  'ben-horowitz': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/2024-07-21_Reuni%C3%A3o_de_Geraldo_Alckmin_com_Ben_Horowitz_01.jpg',
  'benjamin-franklin': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Benjamin_Franklin,_head-and-shoulders_portrait,_facing_slightly_right,_wearing_fur_collar_LCCN00649615.jpg',
  'bill-gates': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Bill_Gates_2018.jpg',
  'brendon-burchard': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Brendon_Burchard_at_Expert_Academy_2018.jpg',
  'bruce-lee': 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Bruce_Lee_as_Chen_Zhen_%284x5_cropped%29.jpg',
  'cal-newport': 'https://calnewport.com/wp-content/uploads/2024/05/Home-header-1-2-1.jpg',
  'charles-darwin': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Charles_Darwin.jpg',
  'charlie-munger': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Charlie_Munger_(cropped).jpg',
  'chip-heath': 'https://heathbrothers.com/wp-content/uploads/2013/01/chip-265x265.png',
  'dan-heath': 'https://heathbrothers.com/wp-content/uploads/2025/12/DanHeath-265x265.png',
  'daniel-kahneman': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Daniel_Kahneman_(3283955327).jpg',
  'david-goggins': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/DavidGogginsMay08.jpg',
  'david-m-buss': 'https://labs.la.utexas.edu/buss/files/2015/09/cropped-h_2.jpg',
  'david-ogilvy': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/David_ogilvy.jpg',
  'dee-hock': 'https://upload.wikimedia.org/wikipedia/en/a/a8/Dee_Hock_%282018%29.jpg',
  'don-a-moore': 'https://haas.berkeley.edu/wp-content/uploads/Professor-Don-Moore_Berkeley-Haas-600x600.jpg',
  'eckhart-tolle': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Eckhart_Tolle_front.jpg',
  'edward-o-thorp': 'https://www.sciencenews.org/wp-content/uploads/sites/2/2017/10/Edward20Thorp20Picture20-20Credit20Mark20Jordan202800229.jpg?resize=768,960',
  'ed-catmull': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Ed_Catmull_at_Web_Summit_2015.jpg',
  'eric-ries': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Eric_Ries2.jpg',
  'felix-dennis': 'https://i.guim.co.uk/img/static/sys-images/Media/Pix/pictures/2012/10/24/1351071533618/Felix-Dennis-008.jpg?width=700&dpr=1&s=none&crop=none',
  'geoff-smart': 'https://cdn.theorg.com/4513f2de-6625-4ec2-8f4f-3e9e457ef59a_medium.jpg',
  'hamilton-helmer': 'https://7powers.com/wp-content/uploads/2016/06/Hamilton-Helmer_strategist-author_7-Powers.jpg',
  'haruki-murakami': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Photo_signed_by_Haruki_Murakami.jpg?width=500',
  'james-dyson': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Sir_James_Dyson_CBE_FREng_FRS.jpg',
  'jerry-seinfeld': 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Jerry_Seinfeld_2023.jpg',
  'jim-edwards': 'https://storage.googleapis.com/msgsndr/AKUxAt1KmxBorRFAK8WI/media/660c0f84e56c797497fa198c.png',
  'john-caples': 'https://upload.wikimedia.org/wikipedia/commons/8/88/John_Caples.jpg',
  'joseph-sugarman': 'https://cdn.shopify.com/s/files/1/0072/7472/files/Joe_Sugerman_600x600.jpg?v=1685999604',
  'ken-segall': 'https://live.staticflickr.com/8152/7323331430_f60e732a0e_b.jpg',
  'keith-j-cunningham': 'https://keystothevault.com/cdn/shop/files/large_15.webp',
  'lawrence-levy': 'https://lawrencelevy.com/wp-content/uploads/2016/08/19DB1A15-9E74-4D1D-8BEC-47D5770F9966-e1477672573111.jpg',
  'lee-kuan-yew': 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Prime_Minister_Lee_Kuan_Yew_of_Singapore_Making_a_Toast_at_a_State_Dinner_Held_in_His_Honor%2C_1975.jpg',
  'michael-bloomberg': 'https://upload.wikimedia.org/wikipedia/commons/e/e8/MichaelBloomberg-byPhilipRomano_%28cropped%29.jpg',
  'mike-michalowicz': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Mike_Michalowicz%2C_Author_of_The_Pumpkin_Plan_and_The_Toilet_Paper_Entrepreneur.jpg?width=500',
  'mark-roberge': 'https://www.stage2.capital/hs-fs/hubfs/6-4.png?width=900&height=900&name=6-4.png',
  'nassim-nicholas-taleb': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Nassim_Nicholas_Taleb_2013.jpg?width=500',
  'napoleon-bonaparte': 'https://upload.wikimedia.org/wikipedia/commons/5/50/Jacques-Louis_David_-_The_Emperor_Napoleon_in_His_Study_at_the_Tuileries_-_Google_Art_Project.jpg',
  'orison-swett-marden': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Portrait_of_Orison_Swett_Marden.jpg?width=500',
  'paul-graham': 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Paulgraham_240x320.jpg',
  'phil-knight': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Philknightfootball.jpg',
  'richard-branson': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Richard_Branson_Addresses_the_Our_Ocean_Conference_2015_in_Valpara%C3%ADso_%2821783214958%29_%28cropped%29.jpg',
  'randy-street': 'https://ghsmart.com/wp-content/uploads/2021/12/Street-Randy.jpg',
  'rob-fitzpatrick': 'https://www.momtestbook.com/rob.jpg',
  'robert-cialdini': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Robert_Cialdini.jpg',
  'robert-greene': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Robert_Greene.jpg',
  'rolf-dobelli': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Rolf_Dobelli_Ausschnitt.jpg?width=500',
  'sam-walton': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Sam-Walton.jpg',
  'sam-zell': 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Zell_face_%28cropped%29.jpg',
  'scott-young': 'https://www.scotthyoung.com/blog/wp-content/uploads/2015/03/scott_portrait_1920.jpg',
  'shane-parrish': 'https://fs.blog/wp-content/uploads/2023/04/shane_0010-scaled.jpg',
  'sherlock-holmes': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Sherlock_Holmes_Portrait_Paget.jpg',
  'spencer-johnson': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Spencer_Johnson.png?width=500',
  'steve-jobs': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Steve_Jobs.jpg',
  'stephen-a-schwarzman': 'https://upload.wikimedia.org/wikipedia/commons/0/0a/DBT_Magdalen_College%2C_Oxford_%26_Stephen_Schwarzman_19_March_2024-5_-_53600715712_%28cropped%29.jpg',
  'stef-wertheimer': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Stef_Wertheimer%2C_1977_cropped.jpg?width=500',
  'sonke-ahrens': 'https://images.squarespace-cdn.com/content/v1/61ea8612f1b4331a57b5f9d1/52bbf4f3-5c81-4526-bb5e-b0f5e6025798/7b129b30-30.jpg',
  'theodore-roosevelt': 'https://upload.wikimedia.org/wikipedia/commons/7/7d/Theodore_Roosevelt_by_the_Pach_Bros_%284x5_cropped%29.jpg',
  'vannevar-bush': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Vannevar_Bush%2C_1938%2C_Harris_%26_Ewing_%28cropped%29.jpg?width=500',
  'victor-o-schwab': 'https://www.scientificadvertising.com/wp-content/uploads/2017/03/Vic-Schwab-269x300-269x300.jpg',
  'walt-disney': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Walt_disney_portrait.jpg',
  'will-durant': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Will_Durant.jpg?width=500',
  'william-macaskill': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/William_MacAskill_Portrait_2018.jpg?width=500',
  'winston-churchill': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Sir_Winston_Churchill_-_19086236948_%28restored%29.jpg/3840px-Sir_Winston_Churchill_-_19086236948_%28restored%29.jpg',
  'yuval-noah-harari': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Yuval_Noah_Harari_photo.jpg?width=500'
};

async function download(slug, url) {
  const target = path.join(peopleDir, `${slug}.jpg`);
  if (fs.existsSync(target) && fs.statSync(target).size > 1024) return 'exists';
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X) JevanGoldsmithWebsite/1.0' }
    });
    if (!response.ok) return `${response.status}`;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1024 || buffer.includes(Buffer.from('<html'))) return 'not-image';
    fs.writeFileSync(target, buffer);
    return 'pulled';
  } catch (err) {
    return `error:${err.cause?.code || err.code || err.name}`;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const results = [];
  for (const [slug, url] of Object.entries(assets)) {
    const result = await download(slug, url);
    results.push(`${slug}: ${result}`);
    if (result !== 'exists') await wait(3500);
  }
  console.log(results.join('\n'));
})();
