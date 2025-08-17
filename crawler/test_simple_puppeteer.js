const puppeteer = require('puppeteer');

async function testSimplePuppeteer() {
  let browser;
  try {
    console.log('🚀 간단한 Puppeteer 테스트 시작...');
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    console.log('📄 페이지 접근 중...');
    await page.goto('https://gall.dcinside.com/board/lists?id=dcbest', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    console.log('🔍 게시글 제목 추출 중...');
    const titles = await page.evaluate(() => {
      const titleElements = document.querySelectorAll('tr.ub-content td.gall_tit a');
      return Array.from(titleElements).map(el => el.textContent.trim()).slice(0, 20);
    });
    
    console.log('📋 발견된 게시글 제목들:');
    titles.forEach((title, index) => {
      console.log(`[${index + 1}] ${title}`);
      
      // 성인인증 게시글 확인
      if (title.includes('[ㅇㅎ]') || title.includes('[성인]')) {
        console.log(`🎯🎯🎯 성인인증 게시글 발견! 🎯🎯🎯`);
        console.log(`    제목: "${title}"`);
      }
      
      // 한화 + 김나연 + 수영복 게시글 확인
      if (title.includes('한화') && title.includes('김나연') && title.includes('수영복')) {
        console.log(`🎯🎯🎯 목표 게시글 발견! 🎯🎯🎯`);
        console.log(`    제목: "${title}"`);
      }
    });
    
    // 성인인증 게시글 통계
    const adultTitles = titles.filter(title => 
      title.includes('[ㅇㅎ]') || title.includes('[성인]')
    );
    console.log(`\n📸 성인인증 게시글: ${adultTitles.length}개`);
    
    return titles;
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    return [];
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔌 브라우저 종료');
    }
  }
}

testSimplePuppeteer();


