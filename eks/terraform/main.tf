module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  

  vpc_id = var.vpc_id

  # ✅ Cluster must span at least 2 AZs
  subnet_ids = [
    var.private_subnet_1_id,
    var.private_subnet_2_id
  ]

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  eks_managed_node_groups = {
    default = {
      instance_types = ["t3.small"]

      # ✅ Fix AMI compatibility issue
      ami_type = "AL2_x86_64"

      # ✅ Nodes placed in public subnet for internet access
      subnet_ids = [
        var.public_subnet_id
      ]

      # ✅ Required so nodes can reach EKS
      associate_public_ip_address = true

      min_size     = 2
      max_size     = 2
      desired_size = 2
    }
  }
}