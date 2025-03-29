import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { connectToSocket } from '../coinbaseWebSocket';

const OrderBook = ({ pair }) => {
  const [orderBook, setOrderBook] = useState({ buy: {}, sell: {} });
  const [aggregationIncrement, setAggregationIncrement] = useState(0); // Default to no aggregation
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // New state for error handling

  const handleUpdate = useCallback((data) => {
    if (!data) return;

    // Handle error messages
    if (data.type === 'error') {
      setError(`${data.message} - ${data.reason}`);
      setLoading(false);
      return;
    }

    // Proceed only if it's a valid l2update type
    if (data.type !== 'l2update') return;

    setError(null); // Clear any previous errors if a valid update is received
    setLoading(true);

    setOrderBook(prevOrderBook => {
      const updatedOrderBook = { ...prevOrderBook };
      data.changes.forEach(([side, price, size]) => {
        const parsedPrice = parseFloat(price);
        const parsedSize = parseFloat(size);

        if (parsedSize === 0) {
          delete updatedOrderBook[side][parsedPrice];
        } else {
          updatedOrderBook[side][parsedPrice] = parsedSize;
        }
      });

      const aggregatedOrderBook = aggregationIncrement > 0 
        ? aggregateData(updatedOrderBook, aggregationIncrement) 
        : updatedOrderBook;

      setLoading(false);
      return aggregatedOrderBook;
    });
  }, [aggregationIncrement]);

  // Aggregate order book data
  const aggregateData = (orderBook, increment) => {
    const aggregated = { buy: {}, sell: {} };

    ['buy', 'sell'].forEach(side => {
      Object.entries(orderBook[side]).forEach(([price, size]) => {
        const aggregatedPrice = Math.floor(price / increment) * increment;
        aggregated[side][aggregatedPrice] = (aggregated[side][aggregatedPrice] || 0) + size;
      });
    });

    return aggregated;
  };

  const getSpread = () => {
    const buyPrices = Object.keys(orderBook.buy).map(price => parseFloat(price));
    const sellPrices = Object.keys(orderBook.sell).map(price => parseFloat(price));

    const highestBuyPrice = Math.max(...buyPrices, 0);
    const lowestSellPrice = Math.min(...sellPrices, Infinity);

    const spread = highestBuyPrice && lowestSellPrice
      ? (lowestSellPrice - highestBuyPrice).toFixed(2)
      : '';

    const percentageSpread = highestBuyPrice && lowestSellPrice
      ? (((lowestSellPrice - highestBuyPrice) / lowestSellPrice) * 100).toFixed(2)
      : '';

    return { spread, percentageSpread };
  };

  const renderOrderBookList = useCallback((side) => {
    // Sort by price in descending order and slice to get the latest 20 entries
    const sortedEntries = Object.entries(orderBook[side])
      .sort(([priceA], [priceB]) => priceB - priceA)
      .slice(0, 20);

    let cumulativeTotal = 0;
    return (
      <div className="order-data">
        {sortedEntries.map(([price, quantity]) => {
          cumulativeTotal += parseFloat(quantity);
          return (
            <div key={price} className="flex justify-between pr-2">
              <div className={`text-left w-1/3 py-0.5 ${getColorClass(quantity, side)}`}>
                {parseFloat(price).toFixed(2)}
              </div>
              <div className={`text-right w-1/3 px-2 ${getColorClass(quantity, side)}`}>
                {parseFloat(quantity).toFixed(6)}
              </div>
              <div className={`text-right w-1/3 pl-2 ${getColorClass(quantity, side)}`}>
                {cumulativeTotal.toFixed(6)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [orderBook]);

  const getColorClass = (size, side) => {
    const threshold = 10;
    const color = size > threshold ? 'bright' : 'dark';
    return side === 'buy' ? `${color}-green` : `${color}-red`;
  };

  const handleDropdownChange = (event) => {
    setAggregationIncrement(parseFloat(event.target.value));
  };

  const increaseIncrement = () => {
    setAggregationIncrement(prev => {
      const newValue = prev + 0.01;
      return newValue <= maxOption ? newValue : maxOption;
    });
  };

  const decreaseIncrement = () => {
    setAggregationIncrement(prev => {
      const newValue = prev - 0.01;
      return newValue >= 0 ? newValue : 0;
    });
  };

  const generateDropdownOptions = useMemo(() => {
    const options = [0, 0.01, 0.05, 0.10, 0.50];
    if (!options.includes(aggregationIncrement)) {
      options.push(parseFloat(aggregationIncrement.toFixed(2)));
    }
    return Array.from(new Set(options)).sort((a, b) => a - b);
  }, [aggregationIncrement]);

  const maxOption = useMemo(() => Math.max(...generateDropdownOptions), [generateDropdownOptions]);

  const isIncrementDisabled = aggregationIncrement >= maxOption;
  const isDecrementDisabled = aggregationIncrement <= 0;

  const { spread, percentageSpread } = getSpread();
  const spreadColorClass = spread === '' ? 'text-gray-500' : (parseFloat(spread) >= 0 ? 'bright-green' : 'bright-red');
  const percentageSpreadColorClass = percentageSpread === '' ? 'text-gray-500' : (parseFloat(percentageSpread) >= 0 ? 'bright-green' : 'bright-red');

  useEffect(() => {
    setLoading(true);
    const cleanup = connectToSocket(pair, handleUpdate);

    return () => {
      if (cleanup) cleanup();
      setOrderBook({ buy: {}, sell: {} });
      setLoading(false);
    };
  }, [pair, handleUpdate]);

  return (
    <div className="order-book bg-gray-800 text-white relative">
      {error && (
        <div className="error-container bright-red mt-10 p-4 absolute top-10 left-0 w-full">
          <div className="error-message text-center">No Data available</div>
        </div>
      )}
      <div className="order-container">
        <div className="order-con p-4 flex flex-col space-y-6">
          <div className="flex flex-col">
            <div className="flex justify-between text-gray-400 mb-2">
              <div className="text-left w-1/3">Price</div>
              <div className="text-right w-1/3 px-2">Quantity</div>
              <div className="text-right w-1/3 pl-2">Total</div>
            </div>

            <div className="flex flex-col w-full">
              <OrderSideList
                side="buy"
                loading={loading}
                renderOrderBookList={renderOrderBookList}
                color="bright-green"
              />

              <div className="flex justify-between shadow-xl p-2 my-1 c-gray">
                <div className="text-left w-1/3 text-gray-400">Spread</div>
                <div className={`text-right w-1/3 px-2 ${spreadColorClass}`}>{spread}</div>
                <div className={`text-right w-1/3 pl-2 ${percentageSpreadColorClass}`}>{percentageSpread}%</div>
              </div>

              <OrderSideList
                side="sell"
                loading={loading}
                renderOrderBookList={renderOrderBookList}
                color="bright-red"
              />
            </div>
          </div>
        </div>

        {!error && ( // Conditionally render the aggregation controls
          <div className="aggregation py-2 px-4 flex justify-end items-center">
            <label htmlFor="aggregation" className="block mr-2 text-gray-400">Aggregation</label>
            <div className="flex items-center">
              <button 
                onClick={decreaseIncrement} 
                disabled={isDecrementDisabled}
                className={`px-3 py-1 ${isDecrementDisabled ? 'bg-gray-600 cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-500'} text-white rounded-l transition`}
              >
                -
              </button>
              <select
                id="aggregation"
                value={aggregationIncrement}
                onChange={handleDropdownChange}
                className="agg-dd px-4 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none transition"
              >
                {generateDropdownOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <button 
                onClick={increaseIncrement} 
                disabled={isIncrementDisabled}
                className={`px-3 py-1 ${isIncrementDisabled ? 'bg-gray-600 cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-500'} text-white rounded-r transition`}
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const OrderSideList = React.memo(({ side, loading, renderOrderBookList }) => {
  const colorClass = side === 'buy' ? 'b-bright-green' : 'b-bright-red';

  return (
    <div className={`orders ${side}-orders relative transition-opacity duration-300 ease-in-out`}>
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-8 h-8 border-4 border-t-4 ${colorClass} border-solid rounded-full animate-spin`}></div>
        </div>
      ) : (
        <div className="opacity-100 transition-opacity duration-300 ease-in-out">
          {renderOrderBookList(side)}
        </div>
      )}
    </div>
  );
});

OrderSideList.displayName = 'OrderSideList';

export default OrderBook;
