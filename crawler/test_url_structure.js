const axios = require('axios');
const cheerio = require('cheerio');

async function testUrlStructure() {
  const urls = [
    'https://gall.dcinside.com/board/lists/?id=dcbest&_dcbest=1&page=1',
    'https://gall.dcinside.com/board/lists/?id=dcbest&page=1',
    'https://gall.dcinside.com/board/lists/?id=dcbest&_dcbest=1',
    'https://gall.dcinside.com/board/lists/?id=dcbest'
  ];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n=== 테스트 ${i + 1}: ${url} ===`);
    
    try {
      const res = await axios.get(url, { 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        } 
      });
      
      console.log(`응답 상태: ${res.status}`);
      console.log(`응답 크기: ${res.data.length} bytes`);
      
      const $ = cheerio.load(res.data);
      const posts = [];
      
      $('tr.ub-content').slice(0, 5).each((j, el) => {
        const $el = $(el);
        
        if ($el.hasClass('icon_notice')) return;
        
        const id = $el.attr('data-no');
        const title = $el.find('td.gall_tit a').text().trim();
        const writer = $el.find('td.gall_writer span.nickname em').text().trim();
        
        if (id && title) {
          posts.push({ id, title, writer });
        }
      });
      
      console.log(`발견된 게시글: ${posts.length}개`);
      posts.forEach((post, j) => {
        console.log(`  ${j + 1}. [${post.id}] ${post.title} (${post.writer})`);
      });
      
      // "[한화] [ㅇㅎ] 김나연 수영복" 검색
      const targetPost = posts.find(post => 
        post.title.includes('한화') && post.title.includes('김나연')
      );
      
      if (targetPost) {
        console.log(`🎯 목표 게시글 발견! ID: ${targetPost.id}, 제목: ${targetPost.title}`);
      } else {
        console.log(`❌ 목표 게시글을 찾을 수 없습니다.`);
      }
      
    } catch (error) {
      console.error(`URL 테스트 실패: ${error.message}`);
    }
  }
}

testUrlStructure();
