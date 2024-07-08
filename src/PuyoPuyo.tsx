import React, { useState, useEffect, useCallback } from 'react';
import './PuyoPuyo.css';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#8A2BE2'];
const BOARD_WIDTH = 6;
const BOARD_HEIGHT = 12;

type PuyoType = string | null;
type BoardType = PuyoType[][];

interface PuyoState {
  x: number;
  y: number;
  color: string;
}

const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

const PuyoPuyo: React.FC = () => {
  const [board, setBoard] = useState<BoardType>(() => 
    Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))
  );
  const [currentPuyo, setCurrentPuyo] = useState<PuyoState | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [connectedPuyos, setConnectedPuyos] = useState<number[][][]>([]);
  const [removingPuyos, setRemovingPuyos] = useState<number[][]>([]);

  const initializeGame = useCallback(() => {
    setBoard(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null)));
    setCurrentPuyo(null);
    setGameOver(false);
    setConnectedPuyos([]);
    setRemovingPuyos([]);
  }, []);

  const spawnPuyo = useCallback(() => {
    const newPuyo: PuyoState = {
      x: Math.floor(BOARD_WIDTH / 2),
      y: 0,
      color: getRandomColor(),
    };
    if (board[newPuyo.y][newPuyo.x]) {
      setGameOver(true);
    } else {
      setCurrentPuyo(newPuyo);
    }
  }, [board]);

  const moveDown = useCallback(() => {
    if (currentPuyo && !gameOver) {
      const newY = currentPuyo.y + 1;
      if (newY < BOARD_HEIGHT && !board[newY][currentPuyo.x]) {
        setCurrentPuyo(prevPuyo => ({ ...prevPuyo!, y: newY }));
      } else {
        placePuyo();
      }
    }
  }, [currentPuyo, gameOver, board]);

  const placePuyo = useCallback(() => {
    if (currentPuyo) {
      const newBoard = board.map(row => [...row]);
      newBoard[currentPuyo.y][currentPuyo.x] = currentPuyo.color;
      setBoard(newBoard);
      setCurrentPuyo(null);
      checkAndRemovePuyos(newBoard);
    }
  }, [currentPuyo, board]);

  const checkAndRemovePuyos = useCallback((board: BoardType) => {
    const visited = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(false));
    const toRemove = new Set<string>();
    const connected: number[][][] = [];

    const dfs = (x: number, y: number, color: string, group: number[][]) => {
      if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT || visited[y][x] || board[y][x] !== color) {
        return;
      }
      visited[y][x] = true;
      group.push([x, y]);
      dfs(x + 1, y, color, group);
      dfs(x - 1, y, color, group);
      dfs(x, y + 1, color, group);
      dfs(x, y - 1, color, group);
    };

    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (board[y][x] && !visited[y][x]) {
          const group: number[][] = [];
          dfs(x, y, board[y][x]!, group);
          if (group.length >= 4) {
            group.forEach(([x, y]) => toRemove.add(`${x},${y}`));
          }
          if (group.length >= 2) {
            connected.push(group);
          }
        }
      }
    }

    setConnectedPuyos(connected);

    if (toRemove.size > 0) {
      setRemovingPuyos(Array.from(toRemove).map(coord => coord.split(',').map(Number)));
      setTimeout(() => {
        const newBoard = board.map(row => [...row]);
        toRemove.forEach(coord => {
          const [x, y] = coord.split(',').map(Number);
          newBoard[y][x] = null;
        });
        setBoard(newBoard);
        setRemovingPuyos([]);
        dropPuyos(newBoard);
      }, 500);
    }
  }, []);

  const dropPuyos = useCallback((board: BoardType) => {
    const newBoard = board.map(row => [...row]);
    for (let x = 0; x < BOARD_WIDTH; x++) {
      let writeY = BOARD_HEIGHT - 1;
      for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (newBoard[y][x]) {
          newBoard[writeY][x] = newBoard[y][x];
          if (writeY !== y) {
            newBoard[y][x] = null;
          }
          writeY--;
        }
      }
    }
    setBoard(newBoard);
    checkAndRemovePuyos(newBoard);
  }, [checkAndRemovePuyos]);

  useEffect(() => {
    if (!currentPuyo && !gameOver) {
      spawnPuyo();
    }
    const timer = setInterval(moveDown, 1000);
    return () => clearInterval(timer);
  }, [currentPuyo, gameOver, spawnPuyo, moveDown]);

  const moveLeft = useCallback(() => {
    if (currentPuyo && currentPuyo.x > 0 && !board[currentPuyo.y][currentPuyo.x - 1]) {
      setCurrentPuyo(prevPuyo => ({ ...prevPuyo!, x: prevPuyo!.x - 1 }));
    }
  }, [currentPuyo, board]);

  const moveRight = useCallback(() => {
    if (currentPuyo && currentPuyo.x < BOARD_WIDTH - 1 && !board[currentPuyo.y][currentPuyo.x + 1]) {
      setCurrentPuyo(prevPuyo => ({ ...prevPuyo!, x: prevPuyo!.x + 1 }));
    }
  }, [currentPuyo, board]);

  const hardDrop = useCallback(() => {
    if (currentPuyo && !gameOver) {
      let newY = currentPuyo.y;
      while (newY < BOARD_HEIGHT - 1 && !board[newY + 1][currentPuyo.x]) {
        newY++;
      }
      const newBoard = board.map(row => [...row]);
      newBoard[newY][currentPuyo.x] = currentPuyo.color;
      setBoard(newBoard);
      setCurrentPuyo(null);
      checkAndRemovePuyos(newBoard);
    }
  }, [currentPuyo, gameOver, board, checkAndRemovePuyos]);

  const isConnected = (x: number, y: number) => {
    return connectedPuyos.some(group => group.some(([gx, gy]) => gx === x && gy === y));
  };

  const isRemoving = (x: number, y: number) => {
    return removingPuyos.some(([rx, ry]) => rx === x && ry === y);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <h1 className="text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500" style={{ fontFamily: 'Poppins, sans-serif' }}>Puyo Puyo</h1>

      <div className="game-container">
        <div className="board">
          {board.map((row, y) => (
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className={`puyo ${isConnected(x, y) ? 'connected' : ''} ${isRemoving(x, y) ? 'removing' : ''}`}
                style={{
                  backgroundColor: (currentPuyo && currentPuyo.x === x && currentPuyo.y === y) ? currentPuyo.color : cell || 'transparent',
                }}
              />
            ))
          ))}
        </div>
      </div>

      {gameOver && (
        <div className="flex flex-col items-center">
          <div className="game-over mt-8 animate-bounce">
            Game Over
          </div>
          <button className="restart-btn" onClick={initializeGame}>
            Restart Game
          </button>
        </div>
      )}

      <div className="mt-8 flex space-x-4">
        <button className="btn" onClick={moveLeft}>←</button>
        <button className="btn" onClick={moveRight}>→</button>
        <button className="btn" onClick={hardDrop}>↓</button>
      </div>
    </div>
  );
};

export default PuyoPuyo;
