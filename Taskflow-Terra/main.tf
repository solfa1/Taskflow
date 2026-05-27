# -------------------
# VPC (DNS ENABLED)
# -------------------
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "taskflow-vpc"
  }
}

# -------------------
# Public Subnet
# -------------------
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "us-east-1a"

  tags = {
    Name = "taskflow-subnet"
  }
}

# -------------------
# Internet Gateway
# -------------------
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
}

# -------------------
# Route Table
# -------------------
resource "aws_route_table" "rt" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route" "internet_access" {
  route_table_id         = aws_route_table.rt.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.igw.id
}

resource "aws_route_table_association" "rta" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.rt.id
}

# -------------------
# Security Group (EC2)
# -------------------
resource "aws_security_group" "web_sg" {
  name   = "taskflow-ec2-sg"
  vpc_id = aws_vpc.main.id

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # App
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "taskflow-ec2-sg"
  }
}

# -------------------
# EC2 Spot Instance
# -------------------
resource "aws_instance" "app" {
  ami           = "ami-08c40ec9ead489470" # Ubuntu 22.04
  instance_type = "t3.small"
  subnet_id     = aws_subnet.public.id

  key_name = "taskflow-key"

  vpc_security_group_ids = [aws_security_group.web_sg.id]

  instance_market_options {
    market_type = "spot"

    spot_options {
      max_price = "0.02"
    }
  }

  tags = {
    Name = "taskflow-ec2"
  }
}

# -------------------
# Elastic IP
# -------------------
resource "aws_eip" "eip" {
  domain = "vpc"
}

resource "aws_eip_association" "eip_assoc" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.eip.id
}