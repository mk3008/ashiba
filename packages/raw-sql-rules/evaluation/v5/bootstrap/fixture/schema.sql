CREATE TABLE work_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  owner_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  state ENUM('open', 'closed') NOT NULL,
  priority INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  updated_at DATETIME NOT NULL
);
