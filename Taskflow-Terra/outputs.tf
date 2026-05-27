output "elastic_ip" {
  description = "Static IP for EC2"
  value       = aws_eip.eip.public_ip
}
output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_id" {
  value = aws_subnet.public.id
}

output "ec2_sg_id" {
  value = aws_security_group.web_sg.id
}