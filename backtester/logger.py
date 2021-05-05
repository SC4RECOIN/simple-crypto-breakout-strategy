import arrow


class Logger(object):
    def __init__(self, file_path="data/log.txt"):
        self.path = file_path

        with open(self.path, "w+") as f:
            f.write(f"Backtest run at {arrow.now()}\n\n")

    def log(self, data: dict, ts: arrow.Arrow):
        with open(self.path, "a") as f:
            f.write(f"\n{ts.format('YYYY-MM-DD')}\n")
            for key, value in data.items():
                f.write(f"{key}\t{value}\n")
