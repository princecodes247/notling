import React from 'react';
import {
  Type,
  Hash,
  List,
  CheckSquare,
  Calendar,
  Link as LinkIcon,
  Mail,
  Tag,
  Clock,
  Heading,
  HelpCircle,
} from 'lucide-react';

interface PropertyTypeIconProps {
  type: string;
  icon?: string | null;
  className?: string;
}

export function PropertyTypeIcon({ type, icon, className = 'w-4 h-4' }: PropertyTypeIconProps) {
  if (icon) {
    return <span className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}>{icon}</span>;
  }

  switch (type) {
    case 'title':
      return <Heading className={className} />;
    case 'text':
      return <Type className={className} />;
    case 'number':
      return <Hash className={className} />;
    case 'select':
      return <List className={className} />;
    case 'multi_select':
      return <Tag className={className} />;
    case 'status':
      return <Tag className={className} />;
    case 'date':
      return <Calendar className={className} />;
    case 'checkbox':
      return <CheckSquare className={className} />;
    case 'url':
      return <LinkIcon className={className} />;
    case 'email':
      return <Mail className={className} />;
    case 'created_at':
      return <Clock className={className} />;
    default:
      return <HelpCircle className={className} />;
  }
}
