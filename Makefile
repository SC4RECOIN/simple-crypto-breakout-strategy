build:
	docker build -t breakout-trader .

run: 
	docker run -p 4000:4000 \
	-e FTX_KEY=${FTX_KEY} \
	-e FTX_SECRET=${FTX_SECRET} \
	-e TRADER_WEBPUSH_KEY=${TRADER_WEBPUSH_KEY} \
	breakout-trader 

run-dashboard:
	cd dashboard && \
	REACT_APP_URL="http://localhost:4000" npm run start
