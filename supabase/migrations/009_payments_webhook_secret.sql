-- payments 테이블에 토스 웹훅 검증용 secret 컬럼 추가
ALTER TABLE payments ADD COLUMN toss_secret TEXT;
