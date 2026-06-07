#Aqua (Web and Mobile)

docker exec -it aqua-postgres psql -U postgres -d aqua_db
docker exec -it aqua-postgres psql -U postgres -d aqua_db

docker exec -i aqua-postgres psql -U postgres -d aqua_db -c "\copy \"RegistroScada\" TO STDOUT WITH CSV HEADER" > RegistroScada.csv

aqua_db=# \d
aqua_db=# \d "RegistroScada"
aqua_db=# \q

aqua_db=# select * from "Tenant";
aqua_db=# UPDATE "Tenant" SET "planId" = 3 WHERE id = 4;
aqua_db=# UPDATE "Tenant" SET "planId" = NULL WHERE id = 4;

C:\dev\aqua\aqua-mobile>npx expo install react-native-web react-dom @expo/metro-runtime
env: load .env
env: export EXPO_PUBLIC_API_BASE_URL
› Installing 3 SDK 54.0.0 compatible native modules using npm
> npm install