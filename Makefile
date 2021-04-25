build:
	docker build -t breakout-trader .

run: 
	docker run -p 4000:4000 \
	-e FTX_KEY=${FTX_KEY} \
	-e FTX_SECRET=${FTX_SECRET} \
	breakout-trader 
