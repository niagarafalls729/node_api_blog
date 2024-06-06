const mainSqlQuery = `
  SELECT A.company, A.employment_from, A.employment_to,
  B.PROJECT_NM, B.project_from, B.project_to, B.description, B.tech_stack, B.my_work ,nvl(B.link,' ') as link
  FROM experience A
  LEFT JOIN experience_sub B
  ON A.company_cd = B.company_cd
  ORDER BY A.employment_from desc, B.project_from desc
`;
const saveUserSqlQuery = (id, pw, email) => {
  return `
    INSERT INTO BLOG_USER (id, pw, email) VALUES ('${id}', '${pw}', '${email}')
  `;
};
 
const loginUserSqlQuery = (id, pw ) => {
  return `
    Select * from BLOG_USER where id = '${id}' and pw = '${pw}' and rownum = 1
  `;
};
 
const guestBookListSqlQuery = (index) => {
  console.log("guestBookListSqlQuery:",index)
  let query =` Select * from guestBook WHERE SHOW='Y' `;

  if (index != null) {
    query += ` AND idx = '${index}'  `;
  }

  query += ' order by idx desc';

  return query;
};

const guestBookInsertSqlQuery = (title, contents, id,  index,pw,member_create) => {
  if (index == null) {
    return`
    INSERT INTO guestBook (title, contents, id ,password ,member_create) VALUES ('${title}', '${contents}', '${id}','${pw}','${member_create}')
    ` 
  } else {
    return `
    UPDATE guestBook SET title ='${title}', contents ='${contents}' WHERE idx = '${index}' 
    `;
 
  }
};

const guestBookReplyListSqlQuery = (index) => {
  console.log("guestBookReplyListSqlQuery:",index)
  let query = 'Select * from guestBook_reply';
  query += ` WHERE guestbook_fk = '${index}'`;
  query += ' order by creation_timestamp ';

  return query;
};
const guestBookReplyInsertSqlQuery = ( contents, id,  index ,member_create,guestbook_fk) => {
  if (index == null) {
    return`
    INSERT INTO guestBook_reply ( contents, id  ,member_create,guestbook_fk) VALUES ( '${contents}', '${id}','${member_create}','${guestbook_fk}' )
    ` 
  } else {
    return `
    UPDATE guestBook_reply SET   contents ='${contents}' WHERE idx = '${index}' 
    `;
 
  }
};
const guestBookDeleteSqlQuery = (index) =>{
  return `
    UPDATE guestBook SET show ='N' WHERE idx = '${index}' 
    `;
}

const studyHistoryListSqlQuery = (index) => {
  console.log("studyHistoryListSqlQuery,,,",index)
  let query =` Select * from studyHistory WHERE SHOW='Y' `;

  if (index != null) {
    query += ` AND idx = '${index}'  `;
  }

  query += ' order by idx desc';

  return query;
};

const studyHistoryInsertSqlQuery = (title, contents, id,  index,pw,member_create) => {
  if (index == null) {
    return`
    INSERT INTO studyHistory (title, contents, id ,password ,member_create) VALUES ('${title}', '${contents}', '${id}','${pw}','${member_create}')
    ` 
  } else {
    return `
    UPDATE studyHistory SET title ='${title}', contents ='${contents}' WHERE idx = '${index}' 
    `;
 
  }
};

const studyHistoryReplyListSqlQuery = (index) => {
  console.log("studyHistoryReplyListSqlQuery:",index)
  let query = 'Select * from studyHistory_reply';
  query += ` WHERE guestbook_fk = '${index}'`;
  query += ' order by creation_timestamp ';

  return query;
};
const studyHistoryReplyInsertSqlQuery = ( contents, id,  index ,member_create,guestbook_fk) => {
  if (index == null) {
    return`
    INSERT INTO studyHistory_reply ( contents, id  ,member_create,guestbook_fk) VALUES ( '${contents}', '${id}','${member_create}','${guestbook_fk}' )
    ` 
  } else {
    return `
    UPDATE studyHistory_reply SET   contents ='${contents}' WHERE idx = '${index}' 
    `;
 
  }
};
const studyHistoryDeleteSqlQuery = (index) =>{
  return `
    UPDATE studyHistory SET show ='N' WHERE idx = '${index}' 
    `;
}
const visitLogSqlQuery = (ip, city) =>{
  return `
    INSERT INTO visit_log ( ip,city) VALUES ( '${ip}', '${city}')
   
    `;
}
module.exports = {
  mainSqlQuery,
  saveUserSqlQuery,
  loginUserSqlQuery,
  guestBookListSqlQuery,
  guestBookInsertSqlQuery,
  guestBookReplyListSqlQuery,
  guestBookReplyInsertSqlQuery,
  guestBookDeleteSqlQuery,
  studyHistoryListSqlQuery,
  studyHistoryInsertSqlQuery,
  studyHistoryReplyListSqlQuery,
  studyHistoryReplyInsertSqlQuery,
  studyHistoryDeleteSqlQuery,
  visitLogSqlQuery
};
