import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from collections import deque
import random

class DQN(nn.Module):
    def __init__(self, state_size: int, action_size: int, hidden_size: int = 128):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(state_size, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, action_size),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x)


class ReplayBuffer:
    def __init__(self, capacity: int = 10_000):
        self.buffer = deque(maxlen=capacity)

    def push(self, state, action, reward, next_state, done):
        self.buffer.append((state, action, reward, next_state, done))

    def sample(self, batch_size: int):
        batch = random.sample(self.buffer, batch_size)
        states, actions, rewards, next_states, dones = zip(*batch)
        return (
            np.array(states, dtype=np.float32),
            np.array(actions, dtype=np.int64),
            np.array(rewards, dtype=np.float32),
            np.array(next_states, dtype=np.float32),
            np.array(dones, dtype=np.float32),
        )

    def __len__(self) -> int:
        return len(self.buffer)


class DQNAgent:
    def __init__(
        self,
        state_size: int = 5,
        action_size: int = 6,
        lr: float = 0.001,
        gamma: float = 0.99,
        epsilon: float = 1.0,
        epsilon_min: float = 0.01,
        epsilon_decay: float = 0.995,
    ):
        self.state_size = state_size
        self.action_size = action_size
        self.gamma = gamma
        self.epsilon = epsilon
        self.epsilon_min = epsilon_min
        self.epsilon_decay = epsilon_decay
        self.device = torch.device("cpu")

        self.policy_net = DQN(state_size, action_size).to(self.device)
        self.target_net = DQN(state_size, action_size).to(self.device)
        self.target_net.load_state_dict(self.policy_net.state_dict())
        self.target_net.eval()

        self.optimizer = optim.Adam(self.policy_net.parameters(), lr=lr)
        self.memory = ReplayBuffer()
        self.loss_fn = nn.MSELoss()

    def act(self, state, eval_mode: bool = False):
        if not eval_mode and np.random.rand() < self.epsilon:
            return np.random.randint(self.action_size)
        state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
        with torch.no_grad():
            q_values = self.policy_net(state_tensor)
        return int(torch.argmax(q_values).item())

    def get_q_values(self, state):
        state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
        with torch.no_grad():
            q_values = self.policy_net(state_tensor)
        return q_values.squeeze(0).tolist()

    def remember(self, state, action, reward, next_state, done):
        self.memory.push(state, action, reward, next_state, done)

    def replay(self, batch_size: int = 64):
        if len(self.memory) < batch_size:
            return
        states, actions, rewards, next_states, dones = self.memory.sample(batch_size)
        states_t = torch.FloatTensor(states).to(self.device)
        actions_t = torch.LongTensor(actions).unsqueeze(1).to(self.device)
        rewards_t = torch.FloatTensor(rewards).to(self.device)
        next_states_t = torch.FloatTensor(next_states).to(self.device)
        dones_t = torch.FloatTensor(dones).to(self.device)

        current_q = self.policy_net(states_t).gather(1, actions_t).squeeze(1)
        with torch.no_grad():
            next_q = self.target_net(next_states_t).max(1)[0]
            target_q = rewards_t + (1 - dones_t) * self.gamma * next_q

        loss = self.loss_fn(current_q, target_q)
        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()

        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay

    def update_target(self):
        self.target_net.load_state_dict(self.policy_net.state_dict())


class RetailEnv:
    def __init__(self, batch: dict):
        self.days_left = float(batch["days_left"])
        self.stock = float(batch["stock"])
        self.demand_rate = float(batch["demand_rate"])
        self.price_changes = float(batch["price_change_count"])
        self.cat_idx = float(batch["category_id"])
        self.base_price = float(batch["price"])
        self.cost = float(batch["cost"])
        self.shelf_life = max(1.0, float(batch.get("shelf_life", 14)))
        self.step_count = 0

    @property
    def state(self):
        return [
            self.days_left / self.shelf_life,
            self.stock / 200.0,
            self.demand_rate / 50.0,
            min(10.0, self.price_changes) / 10.0,
            self.cat_idx / 7.0,
        ]

    def step(self, action: int):
        discount = action * 10.0  # 0, 10, 20, 30, 40, 50%
        price = self.base_price * (1.0 - discount / 100.0)

        # Demand elasticity response
        elasticity_factor = 1.0 + (discount / 100.0) * 1.5
        daily_sales = min(self.stock, np.random.poisson(max(1.0, self.demand_rate * elasticity_factor)))
        revenue = daily_sales * price
        cost_of_goods = daily_sales * self.cost

        self.stock -= daily_sales
        self.days_left -= 1
        self.step_count += 1

        done = (self.days_left <= 0) or (self.stock <= 0) or (self.step_count >= 14)

        waste_penalty = 0.0
        if done and self.days_left <= 0 and self.stock > 0:
            waste_penalty = self.stock * self.cost * 1.2  # penalty for unsellable expired goods

        reward = revenue - cost_of_goods - waste_penalty
        return self.state, reward, done
