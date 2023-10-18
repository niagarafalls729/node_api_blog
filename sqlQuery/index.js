const mainSqlQuery = `
  SELECT A.company, A.employment_from, A.employment_to,
  B.PROJECT_NM, B.project_from, B.project_to, B.description, B.tech_stack, B.my_work
  FROM experience A
  LEFT JOIN experience_sub B
  ON A.company_cd = B.company_cd
  ORDER BY A.employment_from desc, B.project_from ASC
`;

module.exports = {
  mainSqlQuery
};
