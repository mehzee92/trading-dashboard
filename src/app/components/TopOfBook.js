"use client";
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Image from 'next/image';
import DataDisplay from '../components/proptypes/DataDisplay';
import { connectToSocket } from './coinbaseWebSocket';

const TopOfBook = ({ onPairChange }) => {
  const [selectedPair, setSelectedPair] = useState('BTC-USD');
  const [tickerData, setTickerData] = useState({
    bestBid: null,
    bestAsk: null,
    bestBidSize: null,
    bestAskSize: null,
    spread: null,
    volume24h: null,
  });
  const [options, setPairOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleUpdate = useCallback((data) => {
    try {
      if (data.type === 'ticker') {
        const bestBid = parseFloat(data.best_bid);
        const bestAsk = parseFloat(data.best_ask);
        const bestBidSize = parseFloat(data.best_bid_size);
        const bestAskSize = parseFloat(data.best_ask_size);
        const volume24h = parseFloat(data.volume_24h);
  
        if (isNaN(bestBid) || isNaN(bestAsk) || isNaN(bestBidSize) || isNaN(bestAskSize) || isNaN(volume24h)) {
          throw new Error('Invalid data format');
        }
        setTickerData({
          bestBid: bestBid.toFixed(2),
          bestAsk: bestAsk.toFixed(2),
          bestBidSize: bestBidSize.toFixed(2),
          bestAskSize: bestAskSize.toFixed(2),
          spread: (bestAsk - bestBid).toFixed(2),
          volume24h: volume24h.toFixed(2),
        });
        setIsLoading(false);
      } else if (data.type === 'error') {
        setError(`${data.message} - ${data.reason || 'No reason provided'}`);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error handling update:', error);
      setError('An unexpected error occurred.');
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    setIsLoading(true);
    fetch('https://api.exchange.coinbase.com/products', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(data => {
        const ids = data.map(item => item.id).sort();
        setPairOptions(ids);
        setIsLoading(false);
      })
      .catch(error => {
        console.log('Error fetching product IDs:', error);
        setError('Error fetching product IDs');
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedPair) return;
    setIsLoading(true);
    setError(null);
    const cleanup = connectToSocket(selectedPair, handleUpdate);

    return () => cleanup();
  }, [selectedPair, handleUpdate]);

  const handleChange = (event) => {
    const newPair = event.target.value;
    setSelectedPair(newPair);
    if (onPairChange) onPairChange(newPair);
  };

  const getIconSrc = (pair) => {
    try {
      return require(`../icons/${pair}.png`).default;
    } catch {
      return require('../icons/default.png').default;
    }
  };

  const getSpreadColorClass = () => {
    if (tickerData.spread === null) return 'text-gray';
    return parseFloat(tickerData.spread) < 1 ? 'text-green' : 'text-red';
  };

  return (
    <div className="top-of-book flex">
      <div className="top-con w-full max-w-sm flex items-center">
        <div className="select-container flex">
          <div className="select-icon">
            <Image
              src={getIconSrc(selectedPair)}
              alt={`Icon for ${selectedPair}`}
              width={50}
              height={50}
              className="mr-2"
            />
          </div>
          <select
            id="pair-select"
            name="pair"
            value={selectedPair}
            onChange={handleChange}
            className="select-box"
          >
            {options.map((pair) => (
              <option key={pair} value={pair}>{pair}</option>
            ))}
          </select>
        </div>

        <div className="book-data ml-16 flex">
          {isLoading ? (
            <p></p>
          ) : error ? (
            <div className="error bright-red">
              {error}
            </div>
          ) : (
            <>
              <div className="dis-con">
                <DataDisplay
                  conData={'w-150'}
                  title="Best Bid"
                  value={tickerData.bestBid}
                  prefix="$"
                  colorClass={'text-green w-150'}
                />
                <DataDisplay
                  conData={'w-80'}
                  title="Size"
                  value={tickerData.bestBidSize}
                  colorClass={'text-green w-80'}
                />
              </div>
              <div className="dis-con">
                <DataDisplay
                  conData={'w-150'}
                  title="Best Ask"
                  value={tickerData.bestAsk}
                  prefix="$"
                  colorClass={'text-red'}
                />
                <DataDisplay
                  conData={'w-80'}
                  title="Size"
                  value={tickerData.bestAskSize}
                  colorClass={'text-red'}
                />
              </div>
              <div className="dis-con">
                <DataDisplay
                  conData={'w-80'}
                  title="Spread"
                  value={tickerData.spread}
                  formatNumber={false}
                  colorClass={getSpreadColorClass()}
                />
                <DataDisplay
                  conData={'w-150'}
                  title="24-Hour Volume"
                  value={tickerData.volume24h}
                  colorClass={'text-orange'}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

TopOfBook.propTypes = {
  onPairChange: PropTypes.func,
};

export default TopOfBook;
