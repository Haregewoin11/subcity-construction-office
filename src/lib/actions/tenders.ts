export type TenderStatus = 
  | 'Draft' | 'Internal Review' | 'Published' | 'Open for Bids' 
  | 'Submission Closed' | 'Evaluation' | 'Awarded' 
  | 'Contract Signed' | 'Implementation' | 'Completed' | 'Cancelled';

export interface Tender {
  id: string;
  ref_no: string;
  title: string;
  project_type: 'School' | 'Health' | 'Youth' | 'Road' | 'Other';
  status: TenderStatus;
  budget_estimate: number;
  submission_deadline: string;
  created_at: string;
}