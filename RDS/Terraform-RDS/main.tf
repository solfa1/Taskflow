# -------------------
# Private Subnets (for RDS)
# -------------------
resource "aws_subnet" "private_1" {
  vpc_id            = var.vpc_id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1a"
}

resource "aws_subnet" "private_2" {
  vpc_id            = var.vpc_id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "us-east-1b"
}

# -------------------
# DB Subnet Group
# -------------------
resource "aws_db_subnet_group" "db_subnet" {
  name = "taskflow-db-subnet-group"

  subnet_ids = [
    aws_subnet.private_1.id,
    aws_subnet.private_2.id
  ]
}

# -------------------
# Security Group (RDS)
# -------------------
resource "aws_security_group" "db_sg" {
  name   = "taskflow-db-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ec2_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# -------------------
# RDS PostgreSQL
# -------------------
resource "aws_db_instance" "postgres" {
  identifier = "taskflow-db"

  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.t3.micro"

  allocated_storage = 20

  db_name  = "taskflow"
  username = "postgres"
  password = "taskflow123"

  publicly_accessible = false   
  skip_final_snapshot = true

  vpc_security_group_ids = [aws_security_group.db_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.db_subnet.name
}