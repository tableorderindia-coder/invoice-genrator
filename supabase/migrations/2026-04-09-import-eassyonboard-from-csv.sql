begin;
-- Generated from user CSV files (EassyOnboard)
truncate table companies cascade;
insert into companies (id,name,billing_address,default_note,created_at) values ('company_eassyonboard','EassyOnboard','Surat, Gujarat, India','Adjusted according to 52 weeks i.e. (hours/week * 52)/12.',now());
insert into teams (id,company_id,name,created_at) values
('team_data','company_eassyonboard','Data Engineering',now()),
('team_finance','company_eassyonboard','Finance',now()),
('team_operations','company_eassyonboard','Operations',now());
insert into employees (id,company_id,full_name,designation,default_team,billing_rate_usd_cents,payout_monthly_usd_cents,hrs_per_week,active_from,active_to,is_active,created_at) values
('emp_pawan_kumar_beesetti','company_eassyonboard','Pawan Kumar Beesetti','Data Engineer','Data Engineering',2500,567688,40,'2025-08-01',null,true,now()),
('emp_nirbhay_kumar_giri','company_eassyonboard','Nirbhay Kumar Giri','Financial Analyst','Finance',2500,548175,40,'2025-08-01',null,true,now()),
('emp_vishal_savaliya','company_eassyonboard','Vishal Savaliya','Operations Specialist','Operations',2500,257812,40,'2025-08-01',null,true,now()),
('emp_srmrati_rathaur','company_eassyonboard','Srmrati Rathaur','Data Engineer','Data Engineering',2500,294688,40,'2025-08-01',null,true,now()),
('emp_vivek_yadav','company_eassyonboard','Vivek Yadav','Financial Analyst','Finance',2500,125688,40,'2025-08-01',null,true,now()),
('emp_lokeswar_beesetti','company_eassyonboard','Lokeswar Beesetti','Operations Specialist','Operations',2500,108388,40,'2025-08-01',null,true,now()),
('emp_utkarsh_dwivedi','company_eassyonboard','Utkarsh Dwivedi','Data Engineer','Data Engineering',2500,146250,40,'2025-08-01',null,true,now()),
('emp_ratnesh_kumar','company_eassyonboard','Ratnesh Kumar','Financial Analyst','Finance',2500,130038,40,'2025-08-01',null,true,now()),
('emp_sri_varshini','company_eassyonboard','Sri Varshini','Operations Specialist','Operations',2500,81200,40,'2025-08-01',null,true,now()),
('emp_darshan_bandache','company_eassyonboard','Darshan Bandache','Data Engineer','Data Engineering',2500,127900,40,'2025-08-01',null,true,now()),
('emp_nagotra_anand_prasad_singh','company_eassyonboard','Nagotra Anand Prasad Singh','Financial Analyst','Finance',2500,127900,40,'2025-08-01',null,true,now()),
('emp_lakshay_chaudhary','company_eassyonboard','Lakshay Chaudhary','Operations Specialist','Operations',2500,106950,40,'2025-08-01',null,true,now());

insert into invoices (id,company_id,month,year,invoice_number,billing_date,due_date,status,note_text,subtotal_usd_cents,adjustments_usd_cents,grand_total_usd_cents,source_invoice_id,pdf_path,created_at,updated_at) values
('invoice_onboarding','company_eassyonboard',8,2025,'Onboarding','2025-08-22','2025-10-06','cashed_out','Adjusted according to 52 weeks i.e. (hours/week * 52)/12.',4493400,0,4493400,null,'/api/invoices/invoice_onboarding/pdf',now(),now()),
('invoice_auginvoice','company_eassyonboard',8,2025,'AugInvoice','2025-08-22','2025-10-06','cashed_out','Adjusted according to 52 weeks i.e. (hours/week * 52)/12.',1976200,0,1976200,null,'/api/invoices/invoice_auginvoice/pdf',now(),now()),
('invoice_sepinvoice','company_eassyonboard',10,2025,'SepInvoice','2025-10-01','2025-11-15','cashed_out','Adjusted according to 52 weeks i.e. (hours/week * 52)/12.',2166700,0,2166700,null,'/api/invoices/invoice_sepinvoice/pdf',now(),now()),
('invoice_octinvoice','company_eassyonboard',11,2025,'OctInvoice','2025-11-03','2025-12-18','cashed_out','Adjusted according to 52 weeks i.e. (hours/week * 52)/12.',2207900,0,2207900,null,'/api/invoices/invoice_octinvoice/pdf',now(),now()),
('invoice_appraisalinvoice','company_eassyonboard',11,2025,'AppraisalInvoice','2025-11-03','2025-12-18','generated','Adjusted according to 52 weeks i.e. (hours/week * 52)/12.',184000,0,184000,null,'/api/invoices/invoice_appraisalinvoice/pdf',now(),now()),
('invoice_novinvoice','company_eassyonboard',12,2025,'NovInvoice','2025-12-01','2026-01-15','cashed_out','Adjusted according to 52 weeks i.e. (hours/week * 52)/12.',2236100,0,2236100,null,'/api/invoices/invoice_novinvoice/pdf',now(),now()),
('invoice_onboarding2','company_eassyonboard',12,2025,'Onboarding2','2025-12-01','2026-01-15','generated','Adjusted according to 52 weeks i.e. (hours/week * 52)/12.',520000,0,520000,null,'/api/invoices/invoice_onboarding2/pdf',now(),now()),
('invoice_decinvoice','company_eassyonboard',1,2026,'DecInvoice','2026-01-06','2026-02-20','cashed_out','Adjusted according to 52 weeks i.e. (hours/week * 52)/12.',2496100,0,2496100,null,'/api/invoices/invoice_decinvoice/pdf',now(),now()),
('invoice_appraisalinvoice2','company_eassyonboard',1,2026,'AppraisalInvoice2','2026-01-06','2026-02-20','generated','Adjusted according to 52 weeks i.e. (hours/week * 52)/12.',352200,0,352200,null,'/api/invoices/invoice_appraisalinvoice2/pdf',now(),now()),
('invoice_janinvoice','company_eassyonboard',2,2026,'JanInvoice','2026-02-02','2026-03-19','cashed_out','Adjusted according to 52 weeks i.e. (hours/week * 52)/12.',2718700,0,2718700,null,'/api/invoices/invoice_janinvoice/pdf',now(),now()),
('invoice_onboarding3','company_eassyonboard',2,2026,'Onboarding3','2026-02-02','2026-03-19','generated','Adjusted according to 52 weeks i.e. (hours/week * 52)/12.',260000,0,260000,null,'/api/invoices/invoice_onboarding3/pdf',now(),now()),
('invoice_febinvoice','company_eassyonboard',3,2026,'FebInvoice','2026-03-20','2026-05-04','generated','Adjusted according to 52 weeks i.e. (hours/week * 52)/12.',2747600,0,2747600,null,'/api/invoices/invoice_febinvoice/pdf',now(),now());

insert into invoice_teams (id,invoice_id,team_name,sort_order) values
('it_invoice_onboarding_1','invoice_onboarding','Operations',1),
('it_invoice_auginvoice_1','invoice_auginvoice','Operations',1),
('it_invoice_sepinvoice_1','invoice_sepinvoice','Operations',1),
('it_invoice_octinvoice_1','invoice_octinvoice','Operations',1),
('it_invoice_appraisalinvoice_1','invoice_appraisalinvoice','Operations',1),
('it_invoice_novinvoice_1','invoice_novinvoice','Operations',1),
('it_invoice_onboarding2_1','invoice_onboarding2','Operations',1),
('it_invoice_decinvoice_1','invoice_decinvoice','Operations',1),
('it_invoice_appraisalinvoice2_1','invoice_appraisalinvoice2','Operations',1),
('it_invoice_janinvoice_1','invoice_janinvoice','Operations',1),
('it_invoice_onboarding3_1','invoice_onboarding3','Operations',1),
('it_invoice_febinvoice_1','invoice_febinvoice','Operations',1);

insert into invoice_adjustments (id,invoice_id,type,label,employee_name,rate_usd_cents,hrs_per_week,amount_usd_cents,sort_order) values
('adj_invoice_onboarding','invoice_onboarding','onboarding','Onboarding advance','Pawan Kumar Beesetti',null,null,4493400,1),
('adj_invoice_appraisalinvoice','invoice_appraisalinvoice','appraisal','Appraisal advance','Vivek Yadav',null,null,184000,1),
('adj_invoice_onboarding2','invoice_onboarding2','onboarding','Onboarding advance','Darshan Bandache',null,null,520000,1),
('adj_invoice_appraisalinvoice2','invoice_appraisalinvoice2','appraisal','Appraisal advance','Vivek Yadav',null,null,352200,1),
('adj_invoice_onboarding3','invoice_onboarding3','onboarding','Onboarding advance','Lakshay Chaudhary',null,null,260000,1);

with adj as (select invoice_id,sum(amount_usd_cents)::int s from invoice_adjustments group by invoice_id)
update invoices i set adjustments_usd_cents=coalesce(adj.s,0), grand_total_usd_cents=i.subtotal_usd_cents+coalesce(adj.s,0), updated_at=now() from adj where i.id=adj.invoice_id;

insert into invoice_realizations (id,invoice_id,realized_at,dollar_inbound_usd_cents,usd_inr_rate,realized_revenue_usd_cents,realized_payout_usd_cents,realized_profit_usd_cents,notes,created_at) values
('real_invoice_onboarding','invoice_onboarding','2025-08-28',4491900,87.87,4493400,0,4491900,'',now()),
('real_invoice_auginvoice','invoice_auginvoice','2025-10-14',1975200,88.45,1976200,1976200,-1000,'',now()),
('real_invoice_sepinvoice','invoice_sepinvoice','2025-10-24',2166700,88.04,2166700,2166700,0,'',now()),
('real_invoice_octinvoice','invoice_octinvoice','2025-11-20',2390900,89.25,2207900,2236100,154800,'412 extra for diwali',now()),
('real_invoice_novinvoice','invoice_novinvoice','2025-12-12',2755100,90.11,2236100,2479300,275800,'Lokesh & Vivek New rate',now()),
('real_invoice_decinvoice','invoice_decinvoice','2026-01-28',2847300,91.64,2496100,2718700,128600,'Darshan & Ananad salary begins',now()),
('real_invoice_janinvoice','invoice_janinvoice','2026-02-27',2977700,90.71,2718700,2834200,143500,'Nirbhay & Vishal new rate, Lakshay salary begins',now());

insert into employee_payouts (id,invoice_id,company_id,employee_id,invoice_line_item_id,employee_name_snapshot,dollar_inward_usd_cents,employee_monthly_usd_cents,cashout_usd_inr_rate,paid_usd_inr_rate,pf_inr_cents,tds_inr_cents,actual_paid_inr_cents,fx_commission_inr_cents,total_commission_usd_cents,commission_earned_inr_cents,is_non_invoice_employee,is_paid,paid_at,created_at,updated_at) values
('ep_invoice_auginvoice_emp_pawan_kumar_beesetti','invoice_auginvoice','company_eassyonboard','emp_pawan_kumar_beesetti',null,'Pawan Kumar Beesetti',0,554700,88.4500,87.4500,0,0,0,554700,-554700,-49063215,false,false,null,now(),now()),
('ep_invoice_sepinvoice_emp_pawan_kumar_beesetti','invoice_sepinvoice','company_eassyonboard','emp_pawan_kumar_beesetti',null,'Pawan Kumar Beesetti',554700,554700,88.0400,87.0400,0,0,0,554700,0,0,false,false,null,now(),now()),
('ep_invoice_octinvoice_emp_pawan_kumar_beesetti','invoice_octinvoice','company_eassyonboard','emp_pawan_kumar_beesetti',null,'Pawan Kumar Beesetti',554700,554700,89.2500,88.2500,0,0,0,554700,0,0,false,false,null,now(),now()),
('ep_invoice_novinvoice_emp_pawan_kumar_beesetti','invoice_novinvoice','company_eassyonboard','emp_pawan_kumar_beesetti',null,'Pawan Kumar Beesetti',554700,554700,90.1100,89.1100,0,0,0,554700,0,0,false,false,null,now(),now()),
('ep_invoice_decinvoice_emp_pawan_kumar_beesetti','invoice_decinvoice','company_eassyonboard','emp_pawan_kumar_beesetti',null,'Pawan Kumar Beesetti',554700,554700,91.6400,90.6400,0,0,0,554700,0,0,false,false,null,now(),now()),
('ep_invoice_janinvoice_emp_pawan_kumar_beesetti','invoice_janinvoice','company_eassyonboard','emp_pawan_kumar_beesetti',null,'Pawan Kumar Beesetti',554700,589400,90.7100,89.7100,0,0,0,589400,-34700,-3147637,false,false,null,now(),now()),
('ep_invoice_febinvoice_emp_pawan_kumar_beesetti','invoice_febinvoice','company_eassyonboard','emp_pawan_kumar_beesetti',null,'Pawan Kumar Beesetti',554700,624000,0.0000,0.0000,0,0,0,0,-69300,0,false,false,null,now(),now()),
('ep_invoice_auginvoice_emp_nirbhay_kumar_giri','invoice_auginvoice','company_eassyonboard','emp_nirbhay_kumar_giri',null,'Nirbhay Kumar Giri',0,520000,88.4500,87.4500,0,0,0,520000,-520000,-45994000,false,false,null,now(),now()),
('ep_invoice_sepinvoice_emp_nirbhay_kumar_giri','invoice_sepinvoice','company_eassyonboard','emp_nirbhay_kumar_giri',null,'Nirbhay Kumar Giri',520000,520000,88.0400,87.0400,0,0,0,520000,0,0,false,false,null,now(),now()),
('ep_invoice_octinvoice_emp_nirbhay_kumar_giri','invoice_octinvoice','company_eassyonboard','emp_nirbhay_kumar_giri',null,'Nirbhay Kumar Giri',520000,520000,89.2500,88.2500,0,0,0,520000,0,0,false,false,null,now(),now()),
('ep_invoice_novinvoice_emp_nirbhay_kumar_giri','invoice_novinvoice','company_eassyonboard','emp_nirbhay_kumar_giri',null,'Nirbhay Kumar Giri',520000,520000,90.1100,89.1100,0,0,0,520000,0,0,false,false,null,now(),now()),
('ep_invoice_decinvoice_emp_nirbhay_kumar_giri','invoice_decinvoice','company_eassyonboard','emp_nirbhay_kumar_giri',null,'Nirbhay Kumar Giri',520000,572000,91.6400,90.6400,0,0,0,572000,-52000,-4765280,false,false,null,now(),now()),
('ep_invoice_janinvoice_emp_nirbhay_kumar_giri','invoice_janinvoice','company_eassyonboard','emp_nirbhay_kumar_giri',null,'Nirbhay Kumar Giri',624000,606700,90.7100,89.7100,0,0,0,606700,17300,1569283,false,false,null,now(),now()),
('ep_invoice_febinvoice_emp_nirbhay_kumar_giri','invoice_febinvoice','company_eassyonboard','emp_nirbhay_kumar_giri',null,'Nirbhay Kumar Giri',572000,606700,0.0000,0.0000,0,0,0,0,-34700,0,false,false,null,now(),now()),
('ep_invoice_auginvoice_emp_vishal_savaliya','invoice_auginvoice','company_eassyonboard','emp_vishal_savaliya',null,'Vishal Savaliya',0,225300,88.4500,87.4500,0,0,0,225300,-225300,-19927785,false,false,null,now(),now()),
('ep_invoice_sepinvoice_emp_vishal_savaliya','invoice_sepinvoice','company_eassyonboard','emp_vishal_savaliya',null,'Vishal Savaliya',225300,225300,88.0400,87.0400,0,0,0,225300,0,0,false,false,null,now(),now()),
('ep_invoice_octinvoice_emp_vishal_savaliya','invoice_octinvoice','company_eassyonboard','emp_vishal_savaliya',null,'Vishal Savaliya',225300,225300,89.2500,88.2500,0,0,0,225300,0,0,false,false,null,now(),now()),
('ep_invoice_novinvoice_emp_vishal_savaliya','invoice_novinvoice','company_eassyonboard','emp_vishal_savaliya',null,'Vishal Savaliya',225300,225300,90.1100,89.1100,0,0,0,225300,0,0,false,false,null,now(),now()),
('ep_invoice_decinvoice_emp_vishal_savaliya','invoice_decinvoice','company_eassyonboard','emp_vishal_savaliya',null,'Vishal Savaliya',225300,312000,91.6400,90.6400,0,0,0,312000,-86700,-7945188,false,false,null,now(),now()),
('ep_invoice_janinvoice_emp_vishal_savaliya','invoice_janinvoice','company_eassyonboard','emp_vishal_savaliya',null,'Vishal Savaliya',398700,312000,90.7100,89.7100,0,0,0,312000,86700,7864557,false,false,null,now(),now()),
('ep_invoice_febinvoice_emp_vishal_savaliya','invoice_febinvoice','company_eassyonboard','emp_vishal_savaliya',null,'Vishal Savaliya',312000,312000,0.0000,0.0000,0,0,0,0,0,0,false,false,null,now(),now()),
('ep_invoice_auginvoice_emp_srmrati_rathaur','invoice_auginvoice','company_eassyonboard','emp_srmrati_rathaur',null,'Srmrati Rathaur',0,294700,88.4500,87.4500,0,0,0,294700,-294700,-26066215,false,false,null,now(),now()),
('ep_invoice_sepinvoice_emp_srmrati_rathaur','invoice_sepinvoice','company_eassyonboard','emp_srmrati_rathaur',null,'Srmrati Rathaur',294700,294700,88.0400,87.0400,0,0,0,294700,0,0,false,false,null,now(),now()),
('ep_invoice_octinvoice_emp_srmrati_rathaur','invoice_octinvoice','company_eassyonboard','emp_srmrati_rathaur',null,'Srmrati Rathaur',294700,294700,89.2500,88.2500,0,0,0,294700,0,0,false,false,null,now(),now()),
('ep_invoice_novinvoice_emp_srmrati_rathaur','invoice_novinvoice','company_eassyonboard','emp_srmrati_rathaur',null,'Srmrati Rathaur',294700,294700,90.1100,89.1100,0,0,0,294700,0,0,false,false,null,now(),now()),
('ep_invoice_decinvoice_emp_srmrati_rathaur','invoice_decinvoice','company_eassyonboard','emp_srmrati_rathaur',null,'Srmrati Rathaur',294700,294700,91.6400,90.6400,0,0,0,294700,0,0,false,false,null,now(),now()),
('ep_invoice_janinvoice_emp_srmrati_rathaur','invoice_janinvoice','company_eassyonboard','emp_srmrati_rathaur',null,'Srmrati Rathaur',294700,294700,90.7100,89.7100,0,0,0,294700,0,0,false,false,null,now(),now()),
('ep_invoice_febinvoice_emp_srmrati_rathaur','invoice_febinvoice','company_eassyonboard','emp_srmrati_rathaur',null,'Srmrati Rathaur',294700,294700,0.0000,0.0000,0,0,0,0,0,0,false,false,null,now(),now()),
('ep_invoice_auginvoice_emp_vivek_yadav','invoice_auginvoice','company_eassyonboard','emp_vivek_yadav',null,'Vivek Yadav',0,104000,88.4500,87.4500,0,0,0,104000,-104000,-9198800,false,false,null,now(),now()),
('ep_invoice_sepinvoice_emp_vivek_yadav','invoice_sepinvoice','company_eassyonboard','emp_vivek_yadav',null,'Vivek Yadav',104000,104000,88.0400,87.0400,0,0,0,104000,0,0,false,false,null,now(),now()),
('ep_invoice_octinvoice_emp_vivek_yadav','invoice_octinvoice','company_eassyonboard','emp_vivek_yadav',null,'Vivek Yadav',104000,138700,89.2500,88.2500,0,0,0,138700,-34700,-3096975,false,false,null,now(),now()),
('ep_invoice_novinvoice_emp_vivek_yadav','invoice_novinvoice','company_eassyonboard','emp_vivek_yadav',null,'Vivek Yadav',136000,138700,90.1100,89.1100,0,0,0,138700,-2700,-243297,false,false,null,now(),now()),
('ep_invoice_decinvoice_emp_vivek_yadav','invoice_decinvoice','company_eassyonboard','emp_vivek_yadav',null,'Vivek Yadav',138700,138700,91.6400,90.6400,0,0,0,138700,0,0,false,false,null,now(),now()),
('ep_invoice_janinvoice_emp_vivek_yadav','invoice_janinvoice','company_eassyonboard','emp_vivek_yadav',null,'Vivek Yadav',138700,138700,90.7100,89.7100,0,0,0,138700,0,0,false,false,null,now(),now()),
('ep_invoice_febinvoice_emp_vivek_yadav','invoice_febinvoice','company_eassyonboard','emp_vivek_yadav',null,'Vivek Yadav',176100,138700,0.0000,0.0000,0,0,0,0,37400,0,false,false,null,now(),now()),
('ep_invoice_auginvoice_emp_lokeswar_beesetti','invoice_auginvoice','company_eassyonboard','emp_lokeswar_beesetti',null,'Lokeswar Beesetti',0,86700,88.4500,87.4500,0,0,0,86700,-86700,-7668615,false,false,null,now(),now()),
('ep_invoice_sepinvoice_emp_lokeswar_beesetti','invoice_sepinvoice','company_eassyonboard','emp_lokeswar_beesetti',null,'Lokeswar Beesetti',86700,86700,88.0400,87.0400,0,0,0,86700,0,0,false,false,null,now(),now()),
('ep_invoice_octinvoice_emp_lokeswar_beesetti','invoice_octinvoice','company_eassyonboard','emp_lokeswar_beesetti',null,'Lokeswar Beesetti',86700,121400,89.2500,88.2500,0,0,0,121400,-34700,-3096975,false,false,null,now(),now()),
('ep_invoice_novinvoice_emp_lokeswar_beesetti','invoice_novinvoice','company_eassyonboard','emp_lokeswar_beesetti',null,'Lokeswar Beesetti',118700,121400,90.1100,89.1100,0,0,0,121400,-2700,-243297,false,false,null,now(),now()),
('ep_invoice_decinvoice_emp_lokeswar_beesetti','invoice_decinvoice','company_eassyonboard','emp_lokeswar_beesetti',null,'Lokeswar Beesetti',121400,121400,91.6400,90.6400,0,0,0,121400,0,0,false,false,null,now(),now()),
('ep_invoice_janinvoice_emp_lokeswar_beesetti','invoice_janinvoice','company_eassyonboard','emp_lokeswar_beesetti',null,'Lokeswar Beesetti',121400,121400,90.7100,89.7100,0,0,0,121400,0,0,false,false,null,now(),now()),
('ep_invoice_febinvoice_emp_lokeswar_beesetti','invoice_febinvoice','company_eassyonboard','emp_lokeswar_beesetti',null,'Lokeswar Beesetti',158800,121400,0.0000,0.0000,0,0,0,0,37400,0,false,false,null,now(),now()),
('ep_invoice_auginvoice_emp_utkarsh_dwivedi','invoice_auginvoice','company_eassyonboard','emp_utkarsh_dwivedi',null,'Utkarsh Dwivedi',0,78000,88.4500,87.4500,0,0,0,78000,-78000,-6899100,false,false,null,now(),now()),
('ep_invoice_sepinvoice_emp_utkarsh_dwivedi','invoice_sepinvoice','company_eassyonboard','emp_utkarsh_dwivedi',null,'Utkarsh Dwivedi',78000,156000,88.0400,87.0400,0,0,0,156000,-78000,-6867120,false,false,null,now(),now()),
('ep_invoice_octinvoice_emp_utkarsh_dwivedi','invoice_octinvoice','company_eassyonboard','emp_utkarsh_dwivedi',null,'Utkarsh Dwivedi',156000,156000,89.2500,88.2500,0,0,0,156000,0,0,false,false,null,now(),now()),
('ep_invoice_novinvoice_emp_utkarsh_dwivedi','invoice_novinvoice','company_eassyonboard','emp_utkarsh_dwivedi',null,'Utkarsh Dwivedi',156000,156000,90.1100,89.1100,0,0,0,156000,0,0,false,false,null,now(),now()),
('ep_invoice_decinvoice_emp_utkarsh_dwivedi','invoice_decinvoice','company_eassyonboard','emp_utkarsh_dwivedi',null,'Utkarsh Dwivedi',156000,156000,91.6400,90.6400,0,0,0,156000,0,0,false,false,null,now(),now()),
('ep_invoice_janinvoice_emp_utkarsh_dwivedi','invoice_janinvoice','company_eassyonboard','emp_utkarsh_dwivedi',null,'Utkarsh Dwivedi',156000,156000,90.7100,89.7100,0,0,0,156000,0,0,false,false,null,now(),now()),
('ep_invoice_febinvoice_emp_utkarsh_dwivedi','invoice_febinvoice','company_eassyonboard','emp_utkarsh_dwivedi',null,'Utkarsh Dwivedi',156000,156000,0.0000,0.0000,0,0,0,0,0,0,false,false,null,now(),now()),
('ep_invoice_auginvoice_emp_ratnesh_kumar','invoice_auginvoice','company_eassyonboard','emp_ratnesh_kumar',null,'Ratnesh Kumar',0,69400,88.4500,87.4500,0,0,0,69400,-69400,-6138430,false,false,null,now(),now()),
('ep_invoice_sepinvoice_emp_ratnesh_kumar','invoice_sepinvoice','company_eassyonboard','emp_ratnesh_kumar',null,'Ratnesh Kumar',69400,138700,88.0400,87.0400,0,0,0,138700,-69300,-6101172,false,false,null,now(),now()),
('ep_invoice_octinvoice_emp_ratnesh_kumar','invoice_octinvoice','company_eassyonboard','emp_ratnesh_kumar',null,'Ratnesh Kumar',138700,138700,89.2500,88.2500,0,0,0,138700,0,0,false,false,null,now(),now()),
('ep_invoice_novinvoice_emp_ratnesh_kumar','invoice_novinvoice','company_eassyonboard','emp_ratnesh_kumar',null,'Ratnesh Kumar',138700,138700,90.1100,89.1100,0,0,0,138700,0,0,false,false,null,now(),now()),
('ep_invoice_decinvoice_emp_ratnesh_kumar','invoice_decinvoice','company_eassyonboard','emp_ratnesh_kumar',null,'Ratnesh Kumar',138700,138700,91.6400,90.6400,0,0,0,138700,0,0,false,false,null,now(),now()),
('ep_invoice_janinvoice_emp_ratnesh_kumar','invoice_janinvoice','company_eassyonboard','emp_ratnesh_kumar',null,'Ratnesh Kumar',138700,138700,90.7100,89.7100,0,0,0,138700,0,0,false,false,null,now(),now()),
('ep_invoice_febinvoice_emp_ratnesh_kumar','invoice_febinvoice','company_eassyonboard','emp_ratnesh_kumar',null,'Ratnesh Kumar',138700,138700,0.0000,0.0000,0,0,0,0,0,0,false,false,null,now(),now()),
('ep_invoice_auginvoice_emp_sri_varshini','invoice_auginvoice','company_eassyonboard','emp_sri_varshini',null,'Sri Varshini',0,43400,88.4500,87.4500,0,0,0,43400,-43400,-3838730,false,false,null,now(),now()),
('ep_invoice_sepinvoice_emp_sri_varshini','invoice_sepinvoice','company_eassyonboard','emp_sri_varshini',null,'Sri Varshini',43400,86600,88.0400,87.0400,0,0,0,86600,-43200,-3803328,false,false,null,now(),now()),
('ep_invoice_octinvoice_emp_sri_varshini','invoice_octinvoice','company_eassyonboard','emp_sri_varshini',null,'Sri Varshini',86600,86600,89.2500,88.2500,0,0,0,86600,0,0,false,false,null,now(),now()),
('ep_invoice_novinvoice_emp_sri_varshini','invoice_novinvoice','company_eassyonboard','emp_sri_varshini',null,'Sri Varshini',86600,86600,90.1100,89.1100,0,0,0,86600,0,0,false,false,null,now(),now()),
('ep_invoice_decinvoice_emp_sri_varshini','invoice_decinvoice','company_eassyonboard','emp_sri_varshini',null,'Sri Varshini',86600,86600,91.6400,90.6400,0,0,0,86600,0,0,false,false,null,now(),now()),
('ep_invoice_janinvoice_emp_sri_varshini','invoice_janinvoice','company_eassyonboard','emp_sri_varshini',null,'Sri Varshini',86600,86600,90.7100,89.7100,0,0,0,86600,0,0,false,false,null,now(),now()),
('ep_invoice_febinvoice_emp_sri_varshini','invoice_febinvoice','company_eassyonboard','emp_sri_varshini',null,'Sri Varshini',86600,86600,0.0000,0.0000,0,0,0,0,0,0,false,false,null,now(),now()),
('ep_invoice_novinvoice_emp_darshan_bandache','invoice_novinvoice','company_eassyonboard','emp_darshan_bandache',null,'Darshan Bandache',0,121600,90.1100,89.1100,0,0,0,121600,-121600,-10957376,false,false,null,now(),now()),
('ep_invoice_decinvoice_emp_darshan_bandache','invoice_decinvoice','company_eassyonboard','emp_darshan_bandache',null,'Darshan Bandache',0,130000,91.6400,90.6400,0,0,0,130000,-130000,-11913200,false,false,null,now(),now()),
('ep_invoice_janinvoice_emp_darshan_bandache','invoice_janinvoice','company_eassyonboard','emp_darshan_bandache',null,'Darshan Bandache',130000,130000,90.7100,89.7100,0,0,0,130000,0,0,false,false,null,now(),now()),
('ep_invoice_febinvoice_emp_darshan_bandache','invoice_febinvoice','company_eassyonboard','emp_darshan_bandache',null,'Darshan Bandache',130000,130000,0.0000,0.0000,0,0,0,0,0,0,false,false,null,now(),now()),
('ep_invoice_novinvoice_emp_nagotra_anand_prasad_singh','invoice_novinvoice','company_eassyonboard','emp_nagotra_anand_prasad_singh',null,'Nagotra Anand Prasad Singh',0,121600,90.1100,89.1100,0,0,0,121600,-121600,-10957376,false,false,null,now(),now()),
('ep_invoice_decinvoice_emp_nagotra_anand_prasad_singh','invoice_decinvoice','company_eassyonboard','emp_nagotra_anand_prasad_singh',null,'Nagotra Anand Prasad Singh',0,130000,91.6400,90.6400,0,0,0,130000,-130000,-11913200,false,false,null,now(),now()),
('ep_invoice_janinvoice_emp_nagotra_anand_prasad_singh','invoice_janinvoice','company_eassyonboard','emp_nagotra_anand_prasad_singh',null,'Nagotra Anand Prasad Singh',130000,130000,90.7100,89.7100,0,0,0,130000,0,0,false,false,null,now(),now()),
('ep_invoice_febinvoice_emp_nagotra_anand_prasad_singh','invoice_febinvoice','company_eassyonboard','emp_nagotra_anand_prasad_singh',null,'Nagotra Anand Prasad Singh',130000,130000,0.0000,0.0000,0,0,0,0,0,0,false,false,null,now(),now()),
('ep_invoice_decinvoice_emp_lakshay_chaudhary','invoice_decinvoice','company_eassyonboard','emp_lakshay_chaudhary',null,'Lakshay Chaudhary',0,83900,91.6400,90.6400,0,0,0,83900,-83900,-7688596,false,false,null,now(),now()),
('ep_invoice_janinvoice_emp_lakshay_chaudhary','invoice_janinvoice','company_eassyonboard','emp_lakshay_chaudhary',null,'Lakshay Chaudhary',0,130000,90.7100,89.7100,0,0,0,130000,-130000,-11792300,false,false,null,now(),now()),
('ep_invoice_febinvoice_emp_lakshay_chaudhary','invoice_febinvoice','company_eassyonboard','emp_lakshay_chaudhary',null,'Lakshay Chaudhary',83900,106950,0.0000,0.0000,0,0,0,0,-23050,0,false,false,null,now(),now());

insert into security_deposit_ledger (id,company_id,employee_id,invoice_id,adjustment_id,movement_type,amount_usd_cents,created_at)
select 'sdl_'||ia.id, 'company_eassyonboard', e.id, ia.invoice_id, ia.id, 'credit', abs(ia.amount_usd_cents), now()
from invoice_adjustments ia join employees e on e.company_id='company_eassyonboard' and lower(trim(e.full_name))=lower(trim(coalesce(ia.employee_name,'')))
where ia.type='onboarding';

commit;
