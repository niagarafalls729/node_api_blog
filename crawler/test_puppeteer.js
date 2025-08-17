const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

async function testPuppeteerCrawling() {
  let browser;
  try {
    console.log('🚀 Puppeteer 크롤링 테스트 시작...');
    
    // 브라우저 시작
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // 브라우저 설정
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // 실시간 베스트 갤러리 접근
    console.log('📄 실시간 베스트 갤러리 접근 중...');
    await page.goto('https://gall.dcinside.com/board/lists?id=dcbest', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // 페이지 로딩 대기
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // HTML 가져오기
    const html = await page.content();
    const $ = cheerio.load(html);
    
    console.log('🔍 게시글 파싱 중...');
    const posts = [];
    
    $('tr.ub-content').each((i, el) => {
      const $el = $(el);
      
      // 공지글 제외
      if ($el.hasClass('icon_notice')) return;
      
      const id = $el.attr('data-no');
      if (!id) return;
      
      // 제목 추출
      const titleEl = $el.find('td.gall_tit a').first();
      titleEl.find('em').remove(); // 댓글 수 제거
      let title = titleEl.text().trim();
      
      if (!title) {
        const thumbAlt = $el.find('td.gall_tit img').attr('alt');
        title = thumbAlt ? `[이미지] ${thumbAlt}` : '[제목없음]';
      }
      
      const writer = $el.find('td.gall_writer span.nickname em').text().trim();
      
      const post = {
        id,
        title,
        writer: writer || '[익명]'
      };
      
      posts.push(post);
      console.log(`[${i+1}] ${id} - "${title}" (${writer})`);
      
      // 성인인증 게시글 확인
      if (title.includes('[ㅇㅎ]') || title.includes('[성인]')) {
        console.log(`🎯🎯🎯 성인인증 게시글 발견! 🎯🎯🎯`);
        console.log(`    ID: ${id}, 제목: "${title}", 작성자: ${writer}`);
      }
      
      // 한화 + 김나연 + 수영복 게시글 확인
      if (title.includes('한화') && title.includes('김나연') && title.includes('수영복')) {
        console.log(`🎯🎯🎯 목표 게시글 발견! 🎯🎯🎯`);
        console.log(`    ID: ${id}, 제목: "${title}", 작성자: ${writer}`);
      }
    });
    
    console.log(`\n✅ 총 ${posts.length}개 게시글 발견`);
    
    // 성인인증 게시글 통계
    const adultPosts = posts.filter(post => 
      post.title.includes('[ㅇㅎ]') || post.title.includes('[성인]')
    );
    console.log(`📸 성인인증 게시글: ${adultPosts.length}개`);
    
    if (adultPosts.length > 0) {
      console.log('성인인증 게시글 목록:');
      adultPosts.forEach(post => {
        console.log(`  - [${post.id}] ${post.title}`);
      });
    }
    
    return posts;
    
  } catch (error) {
    console.error('❌ Puppeteer 크롤링 실패:', error.message);
    return [];
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔌 브라우저 종료');
    }
  }
}

testPuppeteerCrawling();
