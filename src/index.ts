import BackTester from './backtester';
import {config} from '../config';

const args = process.argv;

if (args.length > 2 && args[2] === 'backtest') {
  const strategy = new BackTester(config);
  strategy.backtest();
}
