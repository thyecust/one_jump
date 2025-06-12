import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder } from '@react-three/drei';
import * as THREE from 'three';

// 立方体组件
function Cube({ position, size = [2, 1, 2], color = '#4A90E2' }) {
  return (
    <Box position={position} args={size}>
      <meshStandardMaterial color={color} />
    </Box>
  );
}

// 小圆柱（跳跃的角色）
function Player({ isJumping, jumpTarget, onJumpComplete }) {
  const meshRef = useRef();
  const jumpStartPos = useRef(new THREE.Vector3(0, 1, 0));
  const jumpEndPos = useRef(new THREE.Vector3(0, 1, 0));
  const jumpProgress = useRef(0);
  const isJumpingRef = useRef(false);

  // 初始化位置
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.set(0, 1, 0);
    }
  }, []);

  // 跳跃动画
  useFrame((state, delta) => {
    if (isJumpingRef.current && meshRef.current) {
      jumpProgress.current += delta * 1.5;

      if (jumpProgress.current >= 1) {
        // 跳跃完成
        jumpProgress.current = 0;
        isJumpingRef.current = false;
        meshRef.current.position.copy(jumpEndPos.current);
        meshRef.current.rotation.z = 0;
        onJumpComplete(jumpEndPos.current.clone());
      } else {
        // 插值计算当前位置
        const t = jumpProgress.current;

        const x = THREE.MathUtils.lerp(jumpStartPos.current.x, jumpEndPos.current.x, t);
        const z = THREE.MathUtils.lerp(jumpStartPos.current.z, jumpEndPos.current.z, t);

        const maxHeight = 3;
        const baseY = jumpStartPos.current.y;
        const y = baseY + 4 * maxHeight * t * (1 - t);

        meshRef.current.position.set(x, y, z);
        meshRef.current.rotation.z = -t * Math.PI * 2;
      }
    }
  });

  // 开始新的跳跃
  useEffect(() => {
    if (isJumping && jumpTarget && meshRef.current && !isJumpingRef.current) {
      // 记录起始位置（当前位置）
      jumpStartPos.current.copy(meshRef.current.position);
      // 设置目标位置
      jumpEndPos.current.set(jumpTarget.x, jumpTarget.y, jumpTarget.z);
      // 重置进度并开始跳跃
      jumpProgress.current = 0;
      isJumpingRef.current = true;
    }
  }, [isJumping, jumpTarget]);

  return (
    <Cylinder 
      ref={meshRef}
      args={[0.3, 0.3, 1, 32]}
    >
      <meshStandardMaterial color="#FF6B6B" />
    </Cylinder>
  );
}

// 相机控制组件
function CameraController({ playerPosition }) {
  const { camera } = useThree();
  const currentLookAt = useRef(new THREE.Vector3());

  useFrame(() => {
    if (playerPosition) {
      // 相机跟随玩家
      const cameraOffset = new THREE.Vector3(5, 5, 5);
      const desiredPosition = new THREE.Vector3(
        playerPosition.x + cameraOffset.x,
        playerPosition.y + cameraOffset.y,
        playerPosition.z + cameraOffset.z
      );

      camera.position.lerp(desiredPosition, 0.1);

      // 相机看向玩家
      currentLookAt.current.lerp(playerPosition, 0.1);
      camera.lookAt(currentLookAt.current);
    }
  });

  return null;
}

// 游戏场景组件
function GameScene({ onScoreUpdate }) {
  const [cubes, setCubes] = useState([
    { id: 0, position: [0, 0, 0], size: [2, 1, 2], color: '#4A90E2' },
    { id: 1, position: [0, 0, -4], size: [2, 1, 2], color: '#50C878' }
  ]);
  const [isJumping, setIsJumping] = useState(false);
  const [jumpTarget, setJumpTarget] = useState(null);
  const [playerPosition, setPlayerPosition] = useState(new THREE.Vector3(0, 1, 0));
  const [currentCubeIndex, setCurrentCubeIndex] = useState(0);
  const [score, setScore] = useState(0);
  const nextCubeId = useRef(2);
  const groundRef = useRef();
  const clickPlaneRef = useRef();

  // 更新分数
  useEffect(() => {
    onScoreUpdate(score);
  }, [score, onScoreUpdate]);

  // 更新地面位置
  useFrame(() => {
    if (groundRef.current && clickPlaneRef.current && playerPosition) {
      groundRef.current.position.z = playerPosition.z;
      clickPlaneRef.current.position.z = playerPosition.z;
    }
  });

  // 生成随机颜色
  const getRandomColor = () => {
    const colors = ['#4A90E2', '#50C878', '#FFD700', '#FF6B6B', '#9370DB', '#20B2AA'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // 生成新立方体
  const generateNewCube = () => {
    const lastCube = cubes[cubes.length - 1];
    const distance = 3 + Math.random() * 2;

    const newPosition = [
      lastCube.position[0],
      0,
      lastCube.position[2] - distance
    ];

    const newCube = {
      id: nextCubeId.current++,
      position: newPosition,
      size: [1.5 + Math.random(), 1, 1.5 + Math.random()],
      color: getRandomColor()
    };

    return newCube;
  };

  // 处理跳跃
  const handleJump = () => {
    if (!isJumping && currentCubeIndex < cubes.length - 1) {
      const nextIndex = currentCubeIndex + 1;
      const nextCube = cubes[nextIndex];

      // 设置跳跃目标
      setJumpTarget({
        x: nextCube.position[0],
        y: 1,
        z: nextCube.position[2]
      });

      setIsJumping(true);
      setCurrentCubeIndex(nextIndex);
      setScore(score + 1);
    }
  };

  // 跳跃完成回调
  const handleJumpComplete = (newPosition) => {
    setIsJumping(false);
    setPlayerPosition(newPosition);

    // 如果到达最后一个立方体，生成新的
    if (currentCubeIndex === cubes.length - 1) {
      const newCube = generateNewCube();
      setCubes(prev => [...prev, newCube]);
    }

    // 清理旧立方体，但保持索引正确
    if (cubes.length > 10) {
      const currentCubeId = cubes[currentCubeIndex].id;
      setCubes(prev => {
        const newCubes = prev.slice(-10);
        // 找到当前立方体在新数组中的索引
        const newIndex = newCubes.findIndex(cube => cube.id === currentCubeId);
        setCurrentCubeIndex(newIndex);
        return newCubes;
      });
    }
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1}
        castShadow
      />

      {/* 渲染所有立方体 */}
      {cubes.map((cube) => (
        <Cube 
          key={cube.id}
          position={cube.position} 
          size={cube.size} 
          color={cube.color} 
        />
      ))}

      {/* 小圆柱（玩家） */}
      <Player 
        isJumping={isJumping}
        jumpTarget={jumpTarget}
        onJumpComplete={handleJumpComplete}
      />

      {/* 相机控制器 */}
      <CameraController playerPosition={playerPosition} />

      {/* 地面 */}
      <mesh 
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.5, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>

      {/* 点击平面 */}
      <mesh
        ref={clickPlaneRef}
        position={[0, -0.49, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleJump}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  );
}

// 主游戏组件
export default function JumpGame() {
  const [gameScore, setGameScore] = useState(0);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#87CEEB' }}>
      <Canvas
        camera={{ 
          position: [5, 5, 5], 
          fov: 60,
          near: 0.1,
          far: 1000
        }}
        shadows
      >
        <GameScene onScoreUpdate={setGameScore} />
      </Canvas>

      {/* UI界面 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        fontSize: '20px',
        fontWeight: 'bold',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        textAlign: 'center'
      }}>
        <div>点击屏幕跳跃</div>
        <div style={{ marginTop: '10px', fontSize: '28px' }}>
          得分: {gameScore}
        </div>
      </div>
    </div>
  );
}
