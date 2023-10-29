const mainSqlQuery = `
  SELECT A.company, A.employment_from, A.employment_to,
  B.PROJECT_NM, B.project_from, B.project_to, B.description, B.tech_stack, B.my_work
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
  console.log("index,,,",index)
  let query = 'Select * from guestBook';

  if (index != null) {
    query += ` WHERE idx = '${index}'`;
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

 
module.exports = {
  mainSqlQuery,
  saveUserSqlQuery,
  loginUserSqlQuery,
  guestBookListSqlQuery,
  guestBookInsertSqlQuery
};
