export interface SellerApplication {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
}
