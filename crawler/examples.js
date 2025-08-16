// 크롤링 예제 파일
const { crawlWebsite } = require('./index');

// 예제 1: 네이버 뉴스 크롤링
async function crawlNaverNews() {
  try {
    console.log('네이버 뉴스 크롤링 시작...');
    const $ = await crawlWebsite('https://news.naver.com/');
    
    const newsTitles = [];
    $('.news_area .news_tit').each((index, element) => {
      const title = $(element).text().trim();
      const link = $(element).attr('href');
      newsTitles.push({ title, link });
    });
    
    console.log('크롤링된 뉴스 제목:', newsTitles.slice(0, 5));
    return newsTitles;
  } catch (error) {
    console.error('네이버 뉴스 크롤링 실패:', error);
  }
}

// 예제 2: 특정 웹사이트의 제목 크롤링
async function crawlWebsiteTitles(url, selector = 'h1, h2, h3') {
  try {
    console.log(`${url} 크롤링 시작...`);
    const $ = await crawlWebsite(url);
    
    const titles = [];
    $(selector).each((index, element) => {
      const title = $(element).text().trim();
      if (title) {
        titles.push(title);
      }
    });
    
    console.log('크롤링된 제목들:', titles.slice(0, 10));
    return titles;
  } catch (error) {
    console.error('크롤링 실패:', error);
  }
}

// 예제 3: 이미지 URL 크롤링
async function crawlImages(url) {
  try {
    console.log(`${url} 이미지 크롤링 시작...`);
    const $ = await crawlWebsite(url);
    
    const images = [];
    $('img').each((index, element) => {
      const src = $(element).attr('src');
      const alt = $(element).attr('alt') || '';
      if (src) {
        images.push({ src, alt });
      }
    });
    
    console.log('크롤링된 이미지:', images.slice(0, 5));
    return images;
  } catch (error) {
    console.error('이미지 크롤링 실패:', error);
  }
}

// 테스트 실행 함수
async function runExamples() {
  console.log('=== 크롤링 예제 실행 ===');
  
  // 예제 1 실행
  await crawlNaverNews();
  
  // 예제 2 실행 (GitHub 크롤링)
  await crawlWebsiteTitles('https://github.com/trending', 'h2');
  
  // 예제 3 실행
  await crawlImages('https://example.com');
  
  console.log('=== 크롤링 예제 완료 ===');
}

// 직접 실행 시에만 테스트 실행
if (require.main === module) {
  runExamples();
}

module.exports = {
  crawlNaverNews,
  crawlWebsiteTitles,
  crawlImages,
  runExamples
};

