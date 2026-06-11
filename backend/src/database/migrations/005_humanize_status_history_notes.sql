UPDATE RH
SET Notes = CASE NS.Code
  WHEN 'PENDING' THEN 'Requisicion pendiente'
  WHEN 'IN_REVIEW' THEN 'Requisicion en revision'
  WHEN 'APPROVED' THEN 'Requisicion aprobada'
  WHEN 'IN_PURCHASE' THEN 'Requisicion en compra'
  WHEN 'READY_TO_DELIVER' THEN 'Requisicion lista para entregar'
  WHEN 'PARTIALLY_DELIVERED' THEN 'Entrega parcial registrada'
  WHEN 'DELIVERED' THEN 'Requisicion entregada'
  WHEN 'REJECTED' THEN 'Requisicion rechazada'
  WHEN 'CANCELLED' THEN 'Requisicion cancelada'
  ELSE COALESCE(NS.Name, RH.Notes)
END
FROM RequisitionHistory RH
INNER JOIN RequisitionStatuses NS ON RH.NewStatusId = NS.Id
WHERE RH.Notes = CONCAT('Estado cambiado a ', NS.Code);
