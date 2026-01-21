module.exports = {
  apps: [{
    name: "backend-api",
    script: "./app.js",
    instances: 2, // 2~3개 권장 (CPU 코어 수에 맞춤)
    exec_mode: "cluster", // 클러스터 모드 (여러 프로세스 실행)
    watch: true, // 파일 변경 감지 후 자동 재시작
    ignore_watch: ["node_modules", "log", "public/uploads", "*.log"], // 변경 감지 제외 경로
    env: {
      NODE_ENV: "production"
    }
  }]
}
