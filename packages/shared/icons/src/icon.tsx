import React, { forwardRef } from 'react';

interface SvgProps {
  width?: number;
  height?: number;
  className?: string;
}
export interface IconProps extends React.SVGAttributes<SVGElement> {
  children?: never;
  className?: string;
}

export const H1Icon = forwardRef<SVGSVGElement, SvgProps>(
  ({ width = 15, height = 15 }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={width}
        ref={forwardedRef}
        height={height}
      >
        <path d="M13 20H11V13H4V20H2V4H4V11H11V4H13V20ZM21.0005 8V20H19.0005L19 10.204L17 10.74V8.67L19.5005 8H21.0005Z" />
      </svg>
    );
  },
);

export const H2Icon = forwardRef<SVGSVGElement, SvgProps>(
  ({ width = 15, height = 15 }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        ref={forwardedRef}
        width={width}
        height={height}
      >
        <path d="M4 4V11H11V4H13V20H11V13H4V20H2V4H4ZM18.5 8C20.5711 8 22.25 9.67893 22.25 11.75C22.25 12.6074 21.9623 13.3976 21.4781 14.0292L21.3302 14.2102L18.0343 18H22V20H15L14.9993 18.444L19.8207 12.8981C20.0881 12.5908 20.25 12.1893 20.25 11.75C20.25 10.7835 19.4665 10 18.5 10C17.5818 10 16.8288 10.7071 16.7558 11.6065L16.75 11.75H14.75C14.75 9.67893 16.4289 8 18.5 8Z" />
      </svg>
    );
  },
);

export const ListOrderIcon = forwardRef<SVGSVGElement, SvgProps>(
  ({ width = 15, height = 15 }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        ref={forwardedRef}
        width={width}
        height={height}
      >
        <path d="M5.75024 3.5H4.71733L3.25 3.89317V5.44582L4.25002 5.17782L4.25018 8.5H3V10H7V8.5H5.75024V3.5ZM10 4H21V6H10V4ZM10 11H21V13H10V11ZM10 18H21V20H10V18ZM2.875 15.625C2.875 14.4514 3.82639 13.5 5 13.5C6.17361 13.5 7.125 14.4514 7.125 15.625C7.125 16.1106 6.96183 16.5587 6.68747 16.9167L6.68271 16.9229L5.31587 18.5H7V20H3.00012L2.99959 18.8786L5.4717 16.035C5.5673 15.9252 5.625 15.7821 5.625 15.625C5.625 15.2798 5.34518 15 5 15C4.67378 15 4.40573 15.2501 4.37747 15.5688L4.3651 15.875H2.875V15.625Z" />
      </svg>
    );
  },
);

export const ListUnOrderIcon = forwardRef(
  ({ width = 15, height = 15 }: SvgProps, forwardedRef: any) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        ref={forwardedRef}
        width={width}
        height={height}
      >
        <path d="M8 4H21V6H8V4ZM4.5 6.5C3.67157 6.5 3 5.82843 3 5C3 4.17157 3.67157 3.5 4.5 3.5C5.32843 3.5 6 4.17157 6 5C6 5.82843 5.32843 6.5 4.5 6.5ZM4.5 13.5C3.67157 13.5 3 12.8284 3 12C3 11.1716 3.67157 10.5 4.5 10.5C5.32843 10.5 6 11.1716 6 12C6 12.8284 5.32843 13.5 4.5 13.5ZM4.5 20.4C3.67157 20.4 3 19.7284 3 18.9C3 18.0716 3.67157 17.4 4.5 17.4C5.32843 17.4 6 18.0716 6 18.9C6 19.7284 5.32843 20.4 4.5 20.4ZM8 11H21V13H8V11ZM8 18H21V20H8V18Z" />
      </svg>
    );
  },
);

export const DeleteIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M7 6V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7ZM13.4142 13.9997L15.182 12.232L13.7678 10.8178L12 12.5855L10.2322 10.8178L8.81802 12.232L10.5858 13.9997L8.81802 15.7675L10.2322 17.1817L12 15.4139L13.7678 17.1817L15.182 15.7675L13.4142 13.9997ZM9 4V6H15V4H9Z" />
      </svg>
    );
  },
);

export const InsertColumnRightIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M10 3C10.5523 3 11 3.44772 11 4V20C11 20.5523 10.5523 21 10 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3H10ZM9 5H5V19H9V5ZM18 7C20.7614 7 23 9.23858 23 12C23 14.7614 20.7614 17 18 17C15.2386 17 13 14.7614 13 12C13 9.23858 15.2386 7 18 7ZM19 9H17V10.999L15 11V13L17 12.999V15H19V12.999L21 13V11L19 10.999V9Z" />
      </svg>
    );
  },
);

export const InsertColumnLeftIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M20 3C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H14C13.4477 21 13 20.5523 13 20V4C13 3.44772 13.4477 3 14 3H20ZM19 5H15V19H19V5ZM6 7C8.76142 7 11 9.23858 11 12C11 14.7614 8.76142 17 6 17C3.23858 17 1 14.7614 1 12C1 9.23858 3.23858 7 6 7ZM7 9H5V10.999L3 11V13L5 12.999V15H7V12.999L9 13V11L7 10.999V9Z" />
      </svg>
    );
  },
);

export const ColumnIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M11 5H5V19H11V5ZM13 5V19H19V5H13ZM4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3Z" />
      </svg>
    );
  },
);

export const QuestionIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12 19C12.8284 19 13.5 19.6716 13.5 20.5C13.5 21.3284 12.8284 22 12 22C11.1716 22 10.5 21.3284 10.5 20.5C10.5 19.6716 11.1716 19 12 19ZM12 2C15.3137 2 18 4.68629 18 8C18 10.1646 17.2474 11.2907 15.3259 12.9231C13.3986 14.5604 13 15.2969 13 17H11C11 14.526 11.787 13.3052 14.031 11.3989C15.5479 10.1102 16 9.43374 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8V9H6V8C6 4.68629 8.68629 2 12 2Z" />
      </svg>
    );
  },
);

export const SquareIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3Z" />
      </svg>
    );
  },
);

export const ImageIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M5 11.1005L7 9.1005L12.5 14.6005L16 11.1005L19 14.1005V5H5V11.1005ZM4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM15.5 10C14.6716 10 14 9.32843 14 8.5C14 7.67157 14.6716 7 15.5 7C16.3284 7 17 7.67157 17 8.5C17 9.32843 16.3284 10 15.5 10Z" />
      </svg>
    );
  },
);

export const ImageEditIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M20 3C20.5523 3 21 3.44772 21 4V5.757L19 7.757V5H5V13.1L9 9.1005L13.328 13.429L12.0012 14.7562L11.995 18.995L16.2414 19.0012L17.571 17.671L18.8995 19H19V16.242L21 14.242V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3H20ZM21.7782 7.80761L23.1924 9.22183L15.4142 17L13.9979 16.9979L14 15.5858L21.7782 7.80761ZM15.5 7C16.3284 7 17 7.67157 17 8.5C17 9.32843 16.3284 10 15.5 10C14.6716 10 14 9.32843 14 8.5C14 7.67157 14.6716 7 15.5 7Z" />
      </svg>
    );
  },
);

export const VideoIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM10.6219 8.41459C10.5562 8.37078 10.479 8.34741 10.4 8.34741C10.1791 8.34741 10 8.52649 10 8.74741V15.2526C10 15.3316 10.0234 15.4088 10.0672 15.4745C10.1897 15.6583 10.4381 15.708 10.6219 15.5854L15.5008 12.3328C15.5447 12.3035 15.5824 12.2658 15.6117 12.2219C15.7343 12.0381 15.6846 11.7897 15.5008 11.6672L10.6219 8.41459Z" />
      </svg>
    );
  },
);

export const ArrowRightIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
      </svg>
    );
  },
);

export const CloseCircleIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 10.5858L9.17157 7.75736L7.75736 9.17157L10.5858 12L7.75736 14.8284L9.17157 16.2426L12 13.4142L14.8284 16.2426L16.2426 14.8284L13.4142 12L16.2426 9.17157L14.8284 7.75736L12 10.5858Z" />
      </svg>
    );
  },
);

export const Delete2Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 11H11V17H9V11ZM13 11H15V17H13V11ZM9 4V6H15V4H9Z" />
      </svg>
    );
  },
);

export const MoreIcon = React.forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      ref={forwardedRef}
    >
      <path d="M5 10C3.9 10 3 10.9 3 12C3 13.1 3.9 14 5 14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10ZM19 10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14C20.1 14 21 13.1 21 12C21 10.9 20.1 10 19 10ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z" />
    </svg>
  );
});

export const CloseIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12.0007 10.5865L16.9504 5.63672L18.3646 7.05093L13.4149 12.0007L18.3646 16.9504L16.9504 18.3646L12.0007 13.4149L7.05093 18.3646L5.63672 16.9504L10.5865 12.0007L5.63672 7.05093L7.05093 5.63672L12.0007 10.5865Z" />
      </svg>
    );
  },
);

export const EyeOpenIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12.0003 3C17.3924 3 21.8784 6.87976 22.8189 12C21.8784 17.1202 17.3924 21 12.0003 21C6.60812 21 2.12215 17.1202 1.18164 12C2.12215 6.87976 6.60812 3 12.0003 3ZM12.0003 19C16.2359 19 19.8603 16.052 20.7777 12C19.8603 7.94803 16.2359 5 12.0003 5C7.7646 5 4.14022 7.94803 3.22278 12C4.14022 16.052 7.7646 19 12.0003 19ZM12.0003 16.5C9.51498 16.5 7.50026 14.4853 7.50026 12C7.50026 9.51472 9.51498 7.5 12.0003 7.5C14.4855 7.5 16.5003 9.51472 16.5003 12C16.5003 14.4853 14.4855 16.5 12.0003 16.5ZM12.0003 14.5C13.381 14.5 14.5003 13.3807 14.5003 12C14.5003 10.6193 13.381 9.5 12.0003 9.5C10.6196 9.5 9.50026 10.6193 9.50026 12C9.50026 13.3807 10.6196 14.5 12.0003 14.5Z" />
      </svg>
    );
  },
);

export const SlideRightIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12.1714 10.9998L7.51451 6.34292L8.92872 4.92871L15.9998 11.9998L8.92872 19.0708L7.51451 17.6566L12.1713 12.9998L2.99953 12.9999L2.99951 10.9999L12.1714 10.9998ZM17.9996 18.9997L17.9996 4.99972H19.9996L19.9996 18.9997H17.9996Z" />
      </svg>
    );
  },
);

export const SlideLeftIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M15.0713 4.92871L16.4856 6.34292L11.8287 10.9998L21.0006 10.9999L21.0005 12.9999L11.8287 12.9998L16.4856 17.6566L15.0714 19.0708L8.00028 11.9998L15.0713 4.92871ZM4.00049 18.9997L4.00049 4.99972H6.00049L6.00049 18.9997H4.00049Z" />
      </svg>
    );
  },
);

export const DoubleArrowLeftIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M4.83594 12.0001L11.043 18.2072L12.4573 16.793L7.66436 12.0001L12.4573 7.20718L11.043 5.79297L4.83594 12.0001ZM10.4858 12.0001L16.6929 18.2072L18.1072 16.793L13.3143 12.0001L18.1072 7.20718L16.6929 5.79297L10.4858 12.0001Z" />
      </svg>
    );
  },
);

export const DoubleArrowRightIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M19.1643 12.0001L12.9572 5.79297L11.543 7.20718L16.3359 12.0001L11.543 16.793L12.9572 18.2072L19.1643 12.0001ZM13.5144 12.0001L7.30728 5.79297L5.89307 7.20718L10.686 12.0001L5.89307 16.793L7.30728 18.2072L13.5144 12.0001Z" />
      </svg>
    );
  },
);

export const SavedIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M18 19H19V6.82843L17.1716 5H16V9H7V5H5V19H6V12H18V19ZM4 3H18L20.7071 5.70711C20.8946 5.89464 21 6.149 21 6.41421V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM8 14V19H16V14H8Z" />
      </svg>
    );
  },
);

export const CheckedIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM11.0026 16L18.0737 8.92893L16.6595 7.51472L11.0026 13.1716L8.17421 10.3431L6.75999 11.7574L11.0026 16Z" />
      </svg>
    );
  },
);

export const SpinnerIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
        ref={forwardedRef}
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    );
  },
);

export const DraggableIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
        ref={forwardedRef}
      >
        <path d="M8.5 7C9.32843 7 10 6.32843 10 5.5C10 4.67157 9.32843 4 8.5 4C7.67157 4 7 4.67157 7 5.5C7 6.32843 7.67157 7 8.5 7ZM8.5 13.5C9.32843 13.5 10 12.8284 10 12C10 11.1716 9.32843 10.5 8.5 10.5C7.67157 10.5 7 11.1716 7 12C7 12.8284 7.67157 13.5 8.5 13.5ZM10 18.5C10 19.3284 9.32843 20 8.5 20C7.67157 20 7 19.3284 7 18.5C7 17.6716 7.67157 17 8.5 17C9.32843 17 10 17.6716 10 18.5ZM15.5 7C16.3284 7 17 6.32843 17 5.5C17 4.67157 16.3284 4 15.5 4C14.6716 4 14 4.67157 14 5.5C14 6.32843 14.6716 7 15.5 7ZM17 12C17 12.8284 16.3284 13.5 15.5 13.5C14.6716 13.5 14 12.8284 14 12C14 11.1716 14.6716 10.5 15.5 10.5C16.3284 10.5 17 11.1716 17 12ZM15.5 20C16.3284 20 17 19.3284 17 18.5C17 17.6716 16.3284 17 15.5 17C14.6716 17 14 17.6716 14 18.5C14 19.3284 14.6716 20 15.5 20Z" />
      </svg>
    );
  },
);

export const RemoveColorIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M5.43239 6.84342L1.39355 2.80458L2.80777 1.39036L22.6068 21.1894L21.1925 22.6036L18.1537 19.5647C14.6255 22.8743 9.08161 22.8063 5.6362 19.3609C2.19078 15.9155 2.12284 10.3716 5.43239 6.84342ZM8.2433 4.0259L12.0002 0.269043L18.3641 6.633C20.9499 9.21876 21.6333 12.9865 20.4144 16.197L8.2433 4.0259Z" />
      </svg>
    );
  },
);

export const CheckboxIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM5 5V19H19V5H5ZM11.0026 16L6.75999 11.7574L8.17421 10.3431L11.0026 13.1716L16.6595 7.51472L18.0737 8.92893L11.0026 16Z" />
      </svg>
    );
  },
);

export const CopyIcon = React.forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      ref={forwardedRef}
    >
      <path d="M6.9998 6V3C6.9998 2.44772 7.44752 2 7.9998 2H19.9998C20.5521 2 20.9998 2.44772 20.9998 3V17C20.9998 17.5523 20.5521 18 19.9998 18H16.9998V20.9991C16.9998 21.5519 16.5499 22 15.993 22H4.00666C3.45059 22 3 21.5554 3 20.9991L3.0026 7.00087C3.0027 6.44811 3.45264 6 4.00942 6H6.9998ZM8.9998 6H16.9998V16H18.9998V4H8.9998V6Z" />
    </svg>
  );
});

export const EditIcon = React.forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      ref={forwardedRef}
    >
      <path d="M9.24264 18.9967H21V20.9967H3V16.754L12.8995 6.85453L17.1421 11.0972L9.24264 18.9967ZM14.3137 5.44032L16.435 3.319C16.8256 2.92848 17.4587 2.92848 17.8492 3.319L20.6777 6.14743C21.0682 6.53795 21.0682 7.17112 20.6777 7.56164L18.5563 9.68296L14.3137 5.44032Z" />
    </svg>
  );
});

export const PlusIcon = React.forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      ref={forwardedRef}
    >
      <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" />
    </svg>
  );
});

export const UserIcon = React.forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      ref={forwardedRef}
    >
      <path d="M20 22H4V20C4 17.2386 6.23858 15 9 15H15C17.7614 15 20 17.2386 20 20V22ZM12 13C8.68629 13 6 10.3137 6 7C6 3.68629 8.68629 1 12 1C15.3137 1 18 3.68629 18 7C18 10.3137 15.3137 13 12 13Z" />
    </svg>
  );
});

export const PagesIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M20 22H4C3.44772 22 3 21.5523 3 21V8H21V21C21 21.5523 20.5523 22 20 22ZM21 6H3V3C3 2.44772 3.44772 2 4 2H20C20.5523 2 21 2.44772 21 3V6ZM7 11V15H11V11H7ZM7 17V19H17V17H7ZM13 12V14H17V12H13Z" />
      </svg>
    );
  },
);

export const EventIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M16 16C17.6569 16 19 17.3431 19 19C19 20.6569 17.6569 22 16 22C14.3431 22 13 20.6569 13 19C13 17.3431 14.3431 16 16 16ZM6 12C8.20914 12 10 13.7909 10 16C10 18.2091 8.20914 20 6 20C3.79086 20 2 18.2091 2 16C2 13.7909 3.79086 12 6 12ZM14.5 2C17.5376 2 20 4.46243 20 7.5C20 10.5376 17.5376 13 14.5 13C11.4624 13 9 10.5376 9 7.5C9 4.46243 11.4624 2 14.5 2Z" />
      </svg>
    );
  },
);

export const SegmentIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M10 14L4 5V3H20V5L14 14V20L10 22V14Z" />
      </svg>
    );
  },
);

export const ContentIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M17.2073 2.29291L15.793 3.70712L18.0859 6.00002H13.0002V8.00001H18.0859L15.793 10.2929L17.2073 11.7071L21.9144 7.00001L17.2073 2.29291ZM7.00015 11.5C9.48543 11.5 11.5002 9.4853 11.5002 7.00001C11.5002 4.51473 9.48543 2.50001 7.00015 2.50001C4.51487 2.50001 2.50015 4.51473 2.50015 7.00001C2.50015 9.4853 4.51487 11.5 7.00015 11.5ZM5.91436 18L8.20726 20.2929L6.79304 21.7071L2.08594 17L6.79304 12.2929L8.20726 13.7071L5.91436 16H11.0002V18H5.91436ZM14.0002 13C13.4479 13 13.0002 13.4477 13.0002 14V20C13.0002 20.5523 13.4479 21 14.0002 21H20.0002C20.5524 21 21.0002 20.5523 21.0002 20V14C21.0002 13.4477 20.5524 13 20.0002 13H14.0002Z" />
      </svg>
    );
  },
);

export const ElementIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M3 3C2.44772 3 2 3.44772 2 4V10C2 10.5523 2.44772 11 3 11H10C10.5523 11 11 10.5523 11 10V4C11 3.44772 10.5523 3 10 3H3ZM4 9V5H9V9H4ZM3 13C2.44772 13 2 13.4477 2 14V20C2 20.5523 2.44772 21 3 21H10C10.5523 21 11 20.5523 11 20V14C11 13.4477 10.5523 13 10 13H3ZM4 19V15H9V19H4ZM13 4C13 3.44772 13.4477 3 14 3H21C21.5523 3 22 3.44772 22 4V10C22 10.5523 21.5523 11 21 11H14C13.4477 11 13 10.5523 13 10V4ZM15 5V9H20V5H15ZM14 13C13.4477 13 13 13.4477 13 14V20C13 20.5523 13.4477 21 14 21H21C21.5523 21 22 20.5523 22 20V14C22 13.4477 21.5523 13 21 13H14ZM15 19V15H20V19H15Z" />
      </svg>
    );
  },
);

export const TextInputIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M1 2V5H3V4H5V9H3.5V11H8.5V9H7V4H9V5H11V2H1ZM21 3H14V5H20V19H4V14H2V20C2 20.5523 2.44772 21 3 21H21C21.5523 21 22 20.5523 22 20V4C22 3.44772 21.5523 3 21 3Z" />
      </svg>
    );
  },
);

export const TextFillIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M3 17H21V19H3V17ZM3 11H6V14H3V11ZM8 11H11V14H8V11ZM3 5H6V8H3V5ZM13 5H16V8H13V5ZM18 5H21V8H18V5ZM13 11H16V14H13V11ZM18 11H21V14H18V11ZM8 5H11V8H8V5Z" />
      </svg>
    );
  },
);

export const TimeIcon = React.forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      ref={forwardedRef}
    >
      <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM13 12H17V14H11V7H13V12Z" />
    </svg>
  );
});

export const GroupIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M9 3V5H6V19H9V21H4V3H9ZM15 3H20V21H15V19H18V5H15V3Z" />
      </svg>
    );
  },
);

export const WaitIcon = React.forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      ref={forwardedRef}
    >
      <path d="M17.6177 5.9681L19.0711 4.51472L20.4853 5.92893L19.0319 7.38231C20.2635 8.92199 21 10.875 21 13C21 17.9706 16.9706 22 12 22C7.02944 22 3 17.9706 3 13C3 8.02944 7.02944 4 12 4C14.125 4 16.078 4.73647 17.6177 5.9681ZM11 8V14H13V8H11ZM8 1H16V3H8V1Z" />
    </svg>
  );
});

export const PlaneIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M1.94607 9.31543C1.42353 9.14125 1.4194 8.86022 1.95682 8.68108L21.043 2.31901C21.5715 2.14285 21.8746 2.43866 21.7265 2.95694L16.2733 22.0432C16.1223 22.5716 15.8177 22.59 15.5944 22.0876L11.9999 14L17.9999 6.00005L9.99992 12L1.94607 9.31543Z"
          fill="currentColor"
        />
      </svg>
    );
  },
);

export const BackIcon = React.forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      ref={forwardedRef}
    >
      <path
        d="M8 7V11L2 6L8 1V5H13C17.4183 5 21 8.58172 21 13C21 17.4183 17.4183 21 13 21H4V19H13C16.3137 19 19 16.3137 19 13C19 9.68629 16.3137 7 13 7H8Z"
        fill="currentColor"
      />
    </svg>
  );
});

export const UnPublishIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM9 9H15V15H9V9Z"
          fill="currentColor"
        />
      </svg>
    );
  },
);

export const AddIcon = React.forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      ref={forwardedRef}
    >
      <path
        d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM11 11H7V13H11V17H13V13H17V11H13V7H11V11Z"
        fill="currentColor"
      />
    </svg>
  );
});

export const CompanyIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M10 19.748V16.4C10 15.1174 10.9948 14.1076 12.4667 13.5321C11.5431 13.188 10.5435 13 9.5 13C7.61013 13 5.86432 13.6168 4.45286 14.66C5.33199 17.1544 7.41273 19.082 10 19.748ZM18.8794 16.0859C18.4862 15.5526 17.1708 15 15.5 15C13.4939 15 12 15.7967 12 16.4V20C14.9255 20 17.4843 18.4296 18.8794 16.0859ZM9.55 11.5C10.7926 11.5 11.8 10.4926 11.8 9.25C11.8 8.00736 10.7926 7 9.55 7C8.30736 7 7.3 8.00736 7.3 9.25C7.3 10.4926 8.30736 11.5 9.55 11.5ZM15.5 12.5C16.6046 12.5 17.5 11.6046 17.5 10.5C17.5 9.39543 16.6046 8.5 15.5 8.5C14.3954 8.5 13.5 9.39543 13.5 10.5C13.5 11.6046 14.3954 12.5 15.5 12.5ZM12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22Z" />
      </svg>
    );
  },
);

export const UserIcon2 = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M14 14.252V22H4C4 17.5817 7.58172 14 12 14C12.6906 14 13.3608 14.0875 14 14.252ZM12 13C8.685 13 6 10.315 6 7C6 3.685 8.685 1 12 1C15.315 1 18 3.685 18 7C18 10.315 15.315 13 12 13ZM18 17V14H20V17H23V19H20V22H18V19H15V17H18Z" />
      </svg>
    );
  },
);

export const EventIcon2 = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M13 10H20L11 23V14H4L13 1V10Z" />
      </svg>
    );
  },
);

export const PLUSIcon = React.forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      ref={forwardedRef}
    >
      <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" />
    </svg>
  );
});
export const FilterIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M14 14V20L10 22V14L4 5V3H20V5L14 14ZM6.4037 5L12 13.3944L17.5963 5H6.4037Z" />
      </svg>
    );
  },
);

export const FilterIcon2 = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M10 14L4 5V3H20V5L14 14V20L10 22V14Z" />
      </svg>
    );
  },
);

export const GroupIcon2 = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M2 22C2 17.5817 5.58172 14 10 14C14.4183 14 18 17.5817 18 22H2ZM10 13C6.685 13 4 10.315 4 7C4 3.685 6.685 1 10 1C13.315 1 16 3.685 16 7C16 10.315 13.315 13 10 13ZM17.3628 15.2332C20.4482 16.0217 22.7679 18.7235 22.9836 22H20C20 19.3902 19.0002 17.0139 17.3628 15.2332ZM15.3401 12.9569C16.9728 11.4922 18 9.36607 18 7C18 5.58266 17.6314 4.25141 16.9849 3.09687C19.2753 3.55397 21 5.57465 21 8C21 10.7625 18.7625 13 16 13C15.7763 13 15.556 12.9853 15.3401 12.9569Z" />
      </svg>
    );
  },
);

export const FolderIcon2 = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12.4142 5H21C21.5523 5 22 5.44772 22 6V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H10.4142L12.4142 5ZM12 13C13.3807 13 14.5 11.8807 14.5 10.5C14.5 9.11929 13.3807 8 12 8C10.6193 8 9.5 9.11929 9.5 10.5C9.5 11.8807 10.6193 13 12 13ZM8 18H16C16 15.7909 14.2091 14 12 14C9.79086 14 8 15.7909 8 18Z" />
      </svg>
    );
  },
);

export const UserIcon3 = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M22 20V7L20 3H4L2 7.00353V20C2 20.5523 2.44772 21 3 21H21C21.5523 21 22 20.5523 22 20ZM5.23582 5H18.7638L19.7638 7H4.23682L5.23582 5ZM9 11H15V13H9V11Z" />
      </svg>
    );
  },
);

export const UserProfile = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM6 15V17H18V15H6ZM6 7V13H12V7H6ZM14 7V9H18V7H14ZM14 11V13H18V11H14ZM8 9H10V11H8V9Z" />
      </svg>
    );
  },
);

export const AnalyticsUserIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        {...props}
        ref={forwardedRef}
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  },
);

export const AnalyticsGrowthIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        {...props}
        ref={forwardedRef}
      >
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    );
  },
);

export const FlowIcon = React.forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      ref={forwardedRef}
    >
      <path
        d="M4 13L9 13C11.21 13 13 11.21 13 9L13 4C13 1.79 11.21 0 9 0L4 0C1.79 0 0 1.79 0 4L0 9C0 11.21 1.79 13 4 13ZM6.51662 7.81293L6.58026 7.73515L7.06762 7.2478L4.1201 7.2478C3.7101 7.2478 3.3701 6.9078 3.3701 6.4978C3.3701 6.0878 3.7101 5.7478 4.1201 5.7478L7.06776 5.7478L6.58026 5.2603C6.31156 4.99161 6.29035 4.57442 6.51662 4.27744L6.58026 4.19965C6.84896 3.93096 7.26615 3.90974 7.56313 4.13601L7.64091 4.19965L9.40866 5.9674C9.67736 6.2361 9.69857 6.65329 9.4723 6.95027L9.40866 7.02805L7.64091 8.7958C7.351 9.08572 6.87017 9.08572 6.58026 8.7958C6.31156 8.52711 6.29035 8.10992 6.51662 7.81293ZM5.0999 14.41L5.1999 14.4L11.1999 14.4C12.9099 14.4 14.2999 13.06 14.3899 11.38L14.3999 11.2L14.3999 5.2C14.3999 4.76 14.7599 4.4 15.1999 4.4C15.6099 4.4 15.9399 4.71 15.9899 5.1L15.9999 5.2L15.9999 11.2C15.9999 13.78 13.9699 15.88 11.4099 16L5.1999 16C4.7599 16 4.3999 15.64 4.3999 15.2C4.3999 14.79 4.7099 14.46 5.0999 14.41Z"
        fillRule="evenodd"
        // fill="#9AA0AD"
      />
    </svg>
  );
});

export const ChecklistIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M11 16L5 16C2.24 16 0 13.76 0 11L0 5C0 2.24 2.24 0 5 0L11 0C13.76 0 16 2.24 16 5L16 11C16 13.76 13.76 16 11 16ZM3 5.2C3 4.54 3.54 4 4.2 4C4.86 4 5.4 4.54 5.4 5.2C5.4 5.86 4.86 6.4 4.2 6.4C3.54 6.4 3 5.86 3 5.2ZM12.2 6L7.8 6C7.36 6 7 5.64 7 5.2C7 4.76 7.36 4.4 7.8 4.4L12.2 4.4C12.64 4.4 13 4.76 13 5.2C13 5.64 12.64 6 12.2 6ZM3 10.8C3 10.14 3.54 9.6 4.2 9.6C4.86 9.6 5.4 10.14 5.4 10.8C5.4 11.46 4.86 12 4.2 12C3.54 12 3 11.46 3 10.8ZM10.2 11.6L7.8 11.6C7.36 11.6 7 11.24 7 10.8C7 10.36 7.36 10 7.8 10L10.2 10C10.64 10 11 10.36 11 10.8C11 11.24 10.64 11.6 10.2 11.6Z"
          fillRule="evenodd"
          // fill="#9AA0AD"
        />
      </svg>
    );
  },
);

export const LauncherIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0C3.58 0 0 3.58 0 8ZM1.6001 8C1.6001 11.53 4.4701 14.4 8.0001 14.4C11.5301 14.4 14.4001 11.53 14.4001 8C14.4001 4.47 11.5301 1.6 8.0001 1.6C4.4701 1.6 1.6001 4.47 1.6001 8ZM3 8C3 5.24 5.24 3 8 3C10.76 3 13 5.24 13 8C13 10.76 10.76 13 8 13C5.24 13 3 10.76 3 8Z"
          fillRule="evenodd"
        />
      </svg>
    );
  },
);

export const ResourceCenterIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <rect x="0" y="0" width="16" height="16" fill="#FFFFFF" />
        <path
          d="M0.313965 11.0391L0.313965 6.72686C0.313965 3.09686 3.25396 0.15686 6.88397 0.15686L9.12397 0.15686C12.754 0.15686 15.684 3.09686 15.684 6.72686L15.684 8.16756L15.6866 8.16756L15.6866 11.0476C15.6866 12.6276 14.3966 13.9176 12.8166 13.9176L12.6106 13.9176L12.6106 13.9177L12.5981 13.9177C11.5742 13.9177 10.6264 14.2371 9.84877 14.7821L9.08696 15.5439C8.48593 16.1449 7.51013 16.1449 6.90909 15.5439L6.13242 14.7672C5.40379 14.2625 4.52769 13.9549 3.58056 13.9208L3.58056 13.9191L3.18396 13.9191C1.59396 13.9191 0.313965 12.6291 0.313965 11.0391ZM9.16146 9.73536L9.15146 9.73536C8.09146 9.73536 7.23146 8.88536 7.23146 7.82536C7.23146 6.76536 8.09146 5.90536 9.15146 5.90536L9.16146 5.90536C10.2215 5.90536 11.0715 6.76536 11.0715 7.82536C11.0715 8.87536 10.2115 9.73536 9.16146 9.73536Z"
          fillRule="evenodd"
        />
      </svg>
    );
  },
);

export const BannerIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        fill="currentColor"
        {...props}
        ref={forwardedRef}
        xmlns="http://www.w3.org/2000/svg"
        width="32.300048828125"
        height="30.39990234375"
        viewBox="0 0 32.300048828125 30.39990234375"
      >
        <path
          d="M7 0L25.3 0C29.166 0 32.3 3.13401 32.3 7L32.3 22.8C32.3 26.9967 28.899 30.4 24.7 30.4L7.6 30.4C3.401 30.4 0 26.9967 0 22.8L0 7C0 3.13401 3.13401 0 7 0ZM28.5 15.2L3.8 15.2L3.8 22.8C3.8 24.8349 5.4017 26.4963 7.6 26.6L24.7 26.6C26.797 26.6 28.5 24.8987 28.5 22.8L28.5 15.2ZM21.85 19L10.45 19C9.40066 19 8.55 19.8507 8.55 20.9C8.55 21.9493 9.40066 22.8 10.45 22.8L21.85 22.8C22.8993 22.8 23.75 21.9493 23.75 20.9C23.75 19.8507 22.8993 19 21.85 19Z"
          fillRule="evenodd"
          fill="#000000"
        />
      </svg>
    );
  },
);

export const SurveyIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M16 10.06L16 2.74C16 0 13 0 13 0L3 0C1.37 0 0.62 0.81 0.62 0.81C0 1.49 0 2.74 0 2.74L0 9.37L0 10.06C0 12.8 3 12.8 3 12.8C4 12.8 4 13 4 13L4.5 16L8.5 13C9 12.8 10.73 12.8 10.73 12.8C12.45 12.8 13 12.8 13 12.8C16 12.8 16 10.06 16 10.06Z" />
      </svg>
    );
  },
);

export const NpsIcon = React.forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      ref={forwardedRef}
    >
      <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM7 13C7 15.7614 9.23858 18 12 18C14.7614 18 17 15.7614 17 13H15C15 14.6569 13.6569 16 12 16C10.3431 16 9 14.6569 9 13H7ZM8 11C8.82843 11 9.5 10.3284 9.5 9.5C9.5 8.67157 8.82843 8 8 8C7.17157 8 6.5 8.67157 6.5 9.5C6.5 10.3284 7.17157 11 8 11ZM16 11C16.8284 11 17.5 10.3284 17.5 9.5C17.5 8.67157 16.8284 8 16 8C15.1716 8 14.5 8.67157 14.5 9.5C14.5 10.3284 15.1716 11 16 11Z" />
    </svg>
  );
});

export const PlusIcon3 = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM11 11H7V13H11V17H13V13H17V11H13V7H11V11Z" />
      </svg>
    );
  },
);

export const TooltipIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M3 2L17 2C18.6569 2 20 3.34315 20 5L20 13C20 14.6569 18.6569 16 17 16L17 18.46C17 18.88 16.52 19.11 16.19 18.85L12.6254 16L3 16C1.34315 16 0 14.6569 0 13L0 5C0 3.34315 1.34315 2 3 2ZM4 5.5L16 5.5C16.5523 5.5 17 5.94772 17 6.5C17 7.05228 16.5523 7.5 16 7.5L4 7.5C3.44772 7.5 3 7.05228 3 6.5C3 5.94772 3.44772 5.5 4 5.5ZM4 10.5L10 10.5C10.5523 10.5 11 10.9477 11 11.5C11 12.0523 10.5523 12.5 10 12.5L4 12.5C3.44772 12.5 3 12.0523 3 11.5C3 10.9477 3.44772 10.5 4 10.5Z"
          fillRule="evenodd"
        />
      </svg>
    );
  },
);

export const ModelIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M17 1.5L3 1.5C1.34315 1.5 0 2.84315 0 4.5L0 15.5C0 17.1569 1.34315 18.5 3 18.5L17 18.5C18.6569 18.5 20 17.1569 20 15.5L20 4.5C20 2.84315 18.6569 1.5 17 1.5ZM4 11.5L16 11.5C16.55 11.5 17 11.05 17 10.5L17 5.5C17 4.95 16.55 4.5 16 4.5L4 4.5C3.45 4.5 3 4.95 3 5.5L3 10.5C3 11.05 3.45 11.5 4 11.5ZM4 15.5L16 15.5C16.55 15.5 17 15.05 17 14.5C17 13.95 16.55 13.5 16 13.5L4 13.5C3.45 13.5 3 13.95 3 14.5C3 15.05 3.45 15.5 4 15.5Z"
          fillRule="evenodd"
        />
      </svg>
    );
  },
);

export const IndeterminateCircleIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM7 11V13H17V11H7Z" />
      </svg>
    );
  },
);

export const WarningCircleIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM11 15V17H13V15H11ZM11 7V13H13V7H11Z" />
      </svg>
    );
  },
);

export const UsertourIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <defs>
          <clipPath id="master_svg0_6_12">
            <rect x="0" y="0" width="24" height="24" rx="0" />
          </clipPath>
        </defs>
        <g clipPath="url(#master_svg0_6_12)">
          <g>
            <path
              d="M0,5.50078125C0,5.50078125,6.68673,22.55393125,6.68673,22.55393125C6.68673,22.55393125,7.42733,3.83203125,7.42733,3.83203125C7.42733,3.83203125,0,5.50078125,0,5.50078125C0,5.50078125,0,5.50078125,0,5.50078125Z"
              fill="#867DB3"
              fillOpacity="1"
            />
          </g>
          <g>
            <path
              d="M9.1241505078125,3.51094C9.1241505078125,3.51094,6.9210205078125,22.5797,6.9210205078125,22.5797C6.9210205078125,22.5797,23.9999205078125,0,23.9999205078125,0C23.9999205078125,0,9.1241505078125,3.51094,9.1241505078125,3.51094C9.1241505078125,3.51094,9.1241505078125,3.51094,9.1241505078125,3.51094Z"
              fill="#867DB3"
              fillOpacity="1"
            />
          </g>
        </g>
      </svg>
    );
  },
);

export const CircleIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
      </svg>
    );
  },
);

export const KeyboardIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M3 17H21V19H3V17ZM3 11H6V14H3V11ZM8 11H11V14H8V11ZM3 5H6V8H3V5ZM13 5H16V8H13V5ZM18 5H21V8H18V5ZM13 11H16V14H13V11ZM18 11H21V14H18V11ZM8 5H11V8H8V5Z" />
      </svg>
    );
  },
);

export const DropDownIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M11.9999 13.1714L16.9497 8.22168L18.3639 9.63589L11.9999 15.9999L5.63599 9.63589L7.0502 8.22168L11.9999 13.1714Z" />
      </svg>
    );
  },
);

export const MultiCheckIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M8.00008 6V9H5.00008V6H8.00008ZM3.00008 4V11H10.0001V4H3.00008ZM13.0001 4H21.0001V6H13.0001V4ZM13.0001 11H21.0001V13H13.0001V11ZM13.0001 18H21.0001V20H13.0001V18ZM10.7072 16.2071L9.29297 14.7929L6.00008 18.0858L4.20718 16.2929L2.79297 17.7071L6.00008 20.9142L10.7072 16.2071Z" />
      </svg>
    );
  },
);

export const SettingsIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path
          fillRule="evenodd"
          d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
          clipRule="evenodd"
        />
      </svg>
    );
  },
);

export const CheckmarkIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M5 12L9.28722 16.2923C9.62045 16.6259 9.78706 16.7927 9.99421 16.7928C10.2014 16.7929 10.3681 16.6262 10.7016 16.2929L20 7"
          stroke="stroke-current"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="my-path"
        />
      </svg>
    );
  },
);

export const TaskClickedIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        viewBox="0 0 1024 1024"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M821.248 422.912h-2.048c-14.848 0-28.672 3.072-42.496 10.24-15.872-35.84-49.664-58.368-88.064-58.368-15.36 0-30.72 3.584-44.544 10.24-15.872-35.84-49.664-58.368-88.064-58.368-12.288 0-24.064 2.048-35.328 6.144V253.952c0-55.808-42.496-99.328-96.768-99.328-55.296 0-99.84 44.544-99.84 99.328v333.824l-41.984-41.472c-39.936-39.424-108.544-32.768-141.312 0-31.744 31.744-55.296 98.816-6.656 146.944l256 254.464c5.12 5.12 11.264 10.24 18.432 14.336 46.08 37.376 100.864 61.952 218.112 61.952 268.288 0 290.304-151.04 290.304-319.488V522.24c0.512-55.296-41.984-99.328-95.744-99.328zM243.712 598.528l91.648 91.136c19.968 19.968 53.76 5.632 53.76-22.528V263.68c0-19.456 15.872-34.816 35.328-34.816 18.432 0 32.256 14.848 32.256 34.816v296.96c0 17.92 14.336 32.256 32.256 32.256 16.896 0 30.208-12.8 32.256-28.672v-128c0-19.968 14.336-34.816 33.28-34.816 0.512 0 15.36 0 25.088 9.728 6.144 5.632 8.704 14.336 8.704 25.088V599.04c0 17.92 14.336 32.256 32.256 32.256 16.896 0 30.208-12.8 32.256-28.672V484.352c0-19.968 14.336-34.816 32.256-34.816 34.816 2.56 35.84 31.744 35.84 34.816v143.36c0 17.92 14.336 32.256 32.256 32.256 16.896 0 29.696-12.288 31.744-28.672v-102.912c0-19.456 14.848-34.816 33.792-34.816 0 0 14.848-0.512 24.576 9.216 6.144 5.632 9.216 14.336 9.216 26.112v176.128c0 142.848 0 255.488-225.792 255.488-93.184 0-152.064-19.456-197.632-64.512l-242.176-240.64c-8.192-8.192-12.288-17.92-11.264-28.16 0.512-9.216 5.12-18.944 12.8-26.624s18.432-11.264 28.672-11.264c10.24-1.024 19.968 2.56 26.624 9.216z"
          fill="currentColor"
        />
        <path
          d="M219.648 274.944c17.408-2.56 30.208-17.92 30.208-35.84 0.512-92.672 75.776-168.448 168.96-168.448s168.448 75.264 168.96 168.448c0 17.408 12.8 33.28 30.208 35.84 22.016 3.072 40.448-13.824 40.448-34.816C658.432 107.52 550.912 0 418.816 0S179.2 107.52 179.2 239.616c0 21.504 18.432 38.4 40.448 35.328z"
          fill="currentColor"
        />
      </svg>
    );
  },
);

export const PlayIcon = React.forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      ref={forwardedRef}
    >
      <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM10.6219 8.41459C10.5562 8.37078 10.479 8.34741 10.4 8.34741C10.1791 8.34741 10 8.52649 10 8.74741V15.2526C10 15.3316 10.0234 15.4088 10.0672 15.4745C10.1897 15.6583 10.4381 15.708 10.6219 15.5854L15.5008 12.3328C15.5447 12.3035 15.5824 12.2658 15.6117 12.2219C15.7343 12.0381 15.6846 11.7897 15.5008 11.6672L10.6219 8.41459Z" />
    </svg>
  );
});

export const CancelIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 10.5858L9.17157 7.75736L7.75736 9.17157L10.5858 12L7.75736 14.8284L9.17157 16.2426L12 13.4142L14.8284 16.2426L16.2426 14.8284L13.4142 12L16.2426 9.17157L14.8284 7.75736L12 10.5858Z" />
      </svg>
    );
  },
);

export const GoogleIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        viewBox="0 0 21 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <g clipPath="url(#clip0_729_2080)">
          <path
            d="M20.3052 10.2302C20.3052 9.55044 20.2501 8.86699 20.1325 8.19824H10.7002V12.0491H16.1016C15.8775 13.291 15.1573 14.3897 14.1027 15.0878V17.5864H17.3252C19.2176 15.8448 20.3052 13.2726 20.3052 10.2302Z"
            fill="#4285F4"
          />
          <path
            d="M10.6999 20.0008C13.397 20.0008 15.6714 19.1152 17.3286 17.5867L14.1061 15.088C13.2096 15.698 12.0521 16.0434 10.7036 16.0434C8.09474 16.0434 5.88272 14.2833 5.08904 11.917H1.76367V14.4928C3.46127 17.8696 6.91892 20.0008 10.6999 20.0008Z"
            fill="#34A853"
          />
          <path
            d="M5.08564 11.9172C4.66676 10.6753 4.66676 9.33044 5.08564 8.08848V5.5127H1.76395C0.345611 8.33834 0.345611 11.6674 1.76395 14.493L5.08564 11.9172Z"
            fill="#FBBC04"
          />
          <path
            d="M10.6999 3.95805C12.1256 3.936 13.5035 4.47247 14.536 5.45722L17.3911 2.60218C15.5833 0.904587 13.1838 -0.0287217 10.6999 0.000673888C6.91892 0.000673888 3.46126 2.13185 1.76367 5.51234L5.08537 8.08813C5.87537 5.71811 8.09106 3.95805 10.6999 3.95805Z"
            fill="#EA4335"
          />
        </g>
        <defs>
          <clipPath id="clip0_729_2080">
            <rect width="20" height="20" fill="white" transform="translate(0.5)" />
          </clipPath>
        </defs>
      </svg>
    );
  },
);

export const GithubIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 98 96" {...props} ref={forwardedRef}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
          fill="currentColor"
        />
      </svg>
    );
  },
);

export const ColorIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12 2C17.5222 2 22 5.97778 22 10.8889C22 13.9556 19.5111 16.4444 16.4444 16.4444H14.4778C13.5556 16.4444 12.8111 17.1889 12.8111 18.1111C12.8111 18.5333 12.9778 18.9222 13.2333 19.2111C13.5 19.5111 13.6667 19.9 13.6667 20.3333C13.6667 21.2556 12.9 22 12 22C6.47778 22 2 17.5222 2 12C2 6.47778 6.47778 2 12 2ZM10.8111 18.1111C10.8111 16.0843 12.451 14.4444 14.4778 14.4444H16.4444C18.4065 14.4444 20 12.851 20 10.8889C20 7.1392 16.4677 4 12 4C7.58235 4 4 7.58235 4 12C4 16.19 7.2226 19.6285 11.324 19.9718C10.9948 19.4168 10.8111 18.7761 10.8111 18.1111ZM7.5 12C6.67157 12 6 11.3284 6 10.5C6 9.67157 6.67157 9 7.5 9C8.32843 9 9 9.67157 9 10.5C9 11.3284 8.32843 12 7.5 12ZM16.5 12C15.6716 12 15 11.3284 15 10.5C15 9.67157 15.6716 9 16.5 9C17.3284 9 18 9.67157 18 10.5C18 11.3284 17.3284 12 16.5 12ZM12 9C11.1716 9 10.5 8.32843 10.5 7.5C10.5 6.67157 11.1716 6 12 6C12.8284 6 13.5 6.67157 13.5 7.5C13.5 8.32843 12.8284 9 12 9Z" />
      </svg>
    );
  },
);

export const BoxIcon = React.forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      ref={forwardedRef}
    >
      <path d="M12 1L21.5 6.5V17.5L12 23L2.5 17.5V6.5L12 1ZM5.49388 7.0777L13.0001 11.4234V20.11L19.5 16.3469V7.65311L12 3.311L5.49388 7.0777ZM4.5 8.81329V16.3469L11.0001 20.1101V12.5765L4.5 8.81329Z" />
    </svg>
  );
});

export const AttributeIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M20 22H4C3.44772 22 3 21.5523 3 21V3C3 2.44772 3.44772 2 4 2H20C20.5523 2 21 2.44772 21 3V21C21 21.5523 20.5523 22 20 22ZM19 20V4H5V20H19ZM7 6H11V10H7V6ZM7 12H17V14H7V12ZM7 16H17V18H7V16ZM13 7H17V9H13V7Z" />
      </svg>
    );
  },
);

export const TeamIcon = React.forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      ref={forwardedRef}
    >
      <path d="M12 11C14.7614 11 17 13.2386 17 16V22H15V16C15 14.4023 13.7511 13.0963 12.1763 13.0051L12 13C10.4023 13 9.09634 14.2489 9.00509 15.8237L9 16V22H7V16C7 13.2386 9.23858 11 12 11ZM5.5 14C5.77885 14 6.05009 14.0326 6.3101 14.0942C6.14202 14.594 6.03873 15.122 6.00896 15.6693L6 16L6.0007 16.0856C5.88757 16.0456 5.76821 16.0187 5.64446 16.0069L5.5 16C4.7203 16 4.07955 16.5949 4.00687 17.3555L4 17.5V22H2V17.5C2 15.567 3.567 14 5.5 14ZM18.5 14C20.433 14 22 15.567 22 17.5V22H20V17.5C20 16.7203 19.4051 16.0796 18.6445 16.0069L18.5 16C18.3248 16 18.1566 16.03 18.0003 16.0852L18 16C18 15.3343 17.8916 14.694 17.6915 14.0956C17.9499 14.0326 18.2211 14 18.5 14ZM5.5 8C6.88071 8 8 9.11929 8 10.5C8 11.8807 6.88071 13 5.5 13C4.11929 13 3 11.8807 3 10.5C3 9.11929 4.11929 8 5.5 8ZM18.5 8C19.8807 8 21 9.11929 21 10.5C21 11.8807 19.8807 13 18.5 13C17.1193 13 16 11.8807 16 10.5C16 9.11929 17.1193 8 18.5 8ZM5.5 10C5.22386 10 5 10.2239 5 10.5C5 10.7761 5.22386 11 5.5 11C5.77614 11 6 10.7761 6 10.5C6 10.2239 5.77614 10 5.5 10ZM18.5 10C18.2239 10 18 10.2239 18 10.5C18 10.7761 18.2239 11 18.5 11C18.7761 11 19 10.7761 19 10.5C19 10.2239 18.7761 10 18.5 10ZM12 2C14.2091 2 16 3.79086 16 6C16 8.20914 14.2091 10 12 10C9.79086 10 8 8.20914 8 6C8 3.79086 9.79086 2 12 2ZM12 4C10.8954 4 10 4.89543 10 6C10 7.10457 10.8954 8 12 8C13.1046 8 14 7.10457 14 6C14 4.89543 13.1046 4 12 4Z" />
    </svg>
  );
});

export const AccountIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 8C12.5523 8 13 8.44772 13 9C13 9.55228 12.5523 10 12 10C11.4477 10 11 9.55228 11 9C11 8.44772 11.4477 8 12 8ZM12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12ZM12 15C10.8954 15 10 15.8954 10 17H8C8 14.7909 9.79086 13 12 13C14.2091 13 16 14.7909 16 17H14C14 15.8954 13.1046 15 12 15Z" />
      </svg>
    );
  },
);

export const FlashlightIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M13 9H21L11 24V15H4L13 0V9ZM11 11V7.22063L7.53238 13H13V17.3944L17.263 11H11Z" />
      </svg>
    );
  },
);

export const BaseStationLineIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12 13L18 22H6L12 13ZM12 16.6L9.74 20H14.26L12 16.6ZM10.9393 10.5606C10.3536 9.97486 10.3536 9.02511 10.9393 8.43933C11.5251 7.85354 12.4749 7.85354 13.0607 8.43933C13.6464 9.02511 13.6464 9.97486 13.0607 10.5606C12.4749 11.1464 11.5251 11.1464 10.9393 10.5606ZM5.28249 2.78247L6.6967 4.19668C3.76777 7.12562 3.76777 11.8744 6.6967 14.8033L5.28249 16.2175C1.5725 12.5075 1.5725 6.49245 5.28249 2.78247ZM18.7175 2.78247C22.4275 6.49245 22.4275 12.5075 18.7175 16.2175L17.3033 14.8033C20.2322 11.8744 20.2322 7.12562 17.3033 4.19668L18.7175 2.78247ZM8.11091 5.6109L9.52513 7.02511C8.15829 8.39195 8.15829 10.608 9.52513 11.9749L8.11091 13.3891C5.96303 11.2412 5.96303 7.75878 8.11091 5.6109H8.11091ZM15.8891 5.6109C18.037 7.75878 18.037 11.2412 15.8891 13.3891L14.4749 11.9749C15.8417 10.608 15.8417 8.39195 14.4749 7.02511L15.8891 5.6109Z" />
      </svg>
    );
  },
);

export const FileEditLineIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M21 6.75736L19 8.75736V4H10V9H5V20H19V17.2426L21 15.2426V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5501 3 20.9932V8L9.00319 2H19.9978C20.5513 2 21 2.45531 21 2.9918V6.75736ZM21.7782 8.80761L23.1924 10.2218L15.4142 18L13.9979 17.9979L14 16.5858L21.7782 8.80761Z" />
      </svg>
    );
  },
);

export const Filter2LineIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M14 14V20L10 22V14L4 5V3H20V5L14 14ZM6.4037 5L12 13.3944L17.5963 5H6.4037Z" />
      </svg>
    );
  },
);

export const GroupLineIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M2 22C2 17.5817 5.58172 14 10 14C14.4183 14 18 17.5817 18 22H16C16 18.6863 13.3137 16 10 16C6.68629 16 4 18.6863 4 22H2ZM10 13C6.685 13 4 10.315 4 7C4 3.685 6.685 1 10 1C13.315 1 16 3.685 16 7C16 10.315 13.315 13 10 13ZM10 11C12.21 11 14 9.21 14 7C14 4.79 12.21 3 10 3C7.79 3 6 4.79 6 7C6 9.21 7.79 11 10 11ZM18.2837 14.7028C21.0644 15.9561 23 18.752 23 22H21C21 19.564 19.5483 17.4671 17.4628 16.5271L18.2837 14.7028ZM17.5962 3.41321C19.5944 4.23703 21 6.20361 21 8.5C21 11.3702 18.8042 13.7252 16 13.9776V11.9646C17.6967 11.7222 19 10.264 19 8.5C19 7.11935 18.2016 5.92603 17.041 5.35635L17.5962 3.41321Z" />
      </svg>
    );
  },
);

export const Group2LineIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M9.55 11.5C8.30736 11.5 7.3 10.4926 7.3 9.25C7.3 8.00736 8.30736 7 9.55 7C10.7926 7 11.8 8.00736 11.8 9.25C11.8 10.4926 10.7926 11.5 9.55 11.5ZM10 19.748V16.4C10 15.9116 10.1442 15.4627 10.4041 15.0624C10.1087 15.0213 9.80681 15 9.5 15C7.93201 15 6.49369 15.5552 5.37091 16.4797C6.44909 18.0721 8.08593 19.2553 10 19.748ZM4.45286 14.66C5.86432 13.6168 7.61013 13 9.5 13C10.5435 13 11.5431 13.188 12.4667 13.5321C13.3447 13.1888 14.3924 13 15.5 13C17.1597 13 18.6849 13.4239 19.706 14.1563C19.8976 13.4703 20 12.7471 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 12.9325 4.15956 13.8278 4.45286 14.66ZM18.8794 16.0859C18.4862 15.5526 17.1708 15 15.5 15C13.4939 15 12 15.7967 12 16.4V20C14.9255 20 17.4843 18.4296 18.8794 16.0859ZM12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM15.5 12.5C14.3954 12.5 13.5 11.6046 13.5 10.5C13.5 9.39543 14.3954 8.5 15.5 8.5C16.6046 8.5 17.5 9.39543 17.5 10.5C17.5 11.6046 16.6046 12.5 15.5 12.5Z" />
      </svg>
    );
  },
);

export const Archive2LineIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M22 20V7L20 3H4L2 7.00353V20C2 20.5523 2.44772 21 3 21H21C21.5523 21 22 20.5523 22 20ZM4 9H20V19H4V9ZM5.236 5H18.764L19.764 7H4.237L5.236 5ZM15 11H9V13H15V11Z" />
      </svg>
    );
  },
);

export const EyeNoneIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M4.52047 5.93457L1.39366 2.80777L2.80788 1.39355L22.6069 21.1925L21.1927 22.6068L17.8827 19.2968C16.1814 20.3755 14.1638 21.0002 12.0003 21.0002C6.60812 21.0002 2.12215 17.1204 1.18164 12.0002C1.61832 9.62282 2.81932 7.5129 4.52047 5.93457ZM14.7577 16.1718L13.2937 14.7078C12.902 14.8952 12.4634 15.0002 12.0003 15.0002C10.3434 15.0002 9.00026 13.657 9.00026 12.0002C9.00026 11.537 9.10522 11.0984 9.29263 10.7067L7.82866 9.24277C7.30514 10.0332 7.00026 10.9811 7.00026 12.0002C7.00026 14.7616 9.23884 17.0002 12.0003 17.0002C13.0193 17.0002 13.9672 16.6953 14.7577 16.1718ZM7.97446 3.76015C9.22127 3.26959 10.5793 3.00016 12.0003 3.00016C17.3924 3.00016 21.8784 6.87992 22.8189 12.0002C22.5067 13.6998 21.8038 15.2628 20.8068 16.5925L16.947 12.7327C16.9821 12.4936 17.0003 12.249 17.0003 12.0002C17.0003 9.23873 14.7617 7.00016 12.0003 7.00016C11.7514 7.00016 11.5068 7.01833 11.2677 7.05343L7.97446 3.76015Z" />
      </svg>
    );
  },
);

export const CheckboxIcon2 = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM11.0026 16L18.0737 8.92893L16.6595 7.51472L11.0026 13.1716L8.17421 10.3431L6.75999 11.7574L11.0026 16Z" />
      </svg>
    );
  },
);

export const CheckboxBlankLine = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM5 5V19H19V5H5Z" />
      </svg>
    );
  },
);

export const QuestionMarkCircledIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM11 15V17H13V15H11ZM13 13.3551C14.4457 12.9248 15.5 11.5855 15.5 10C15.5 8.067 13.933 6.5 12 6.5C10.302 6.5 8.88637 7.70919 8.56731 9.31346L10.5288 9.70577C10.6656 9.01823 11.2723 8.5 12 8.5C12.8284 8.5 13.5 9.17157 13.5 10C13.5 10.8284 12.8284 11.5 12 11.5C11.4477 11.5 11 11.9477 11 12.5V14H13V13.3551Z" />
      </svg>
    );
  },
);

export const ZoomInIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M18.031 16.6168L22.3137 20.8995L20.8995 22.3137L16.6168 18.031C15.0769 19.263 13.124 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2C15.968 2 20 6.032 20 11C20 13.124 19.263 15.0769 18.031 16.6168ZM10 10H7V12H10V15H12V12H15V10H12V7H10V10Z" />
      </svg>
    );
  },
);

export const EmptyPlaceholderIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        {...props}
        ref={forwardedRef}
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="11" r="1" />
        <path d="M11 17a1 1 0 0 1 2 0c0 .5-.34 3-.5 4.5a.5.5 0 0 1-1 0c-.16-1.5-.5-4-.5-4.5ZM8 14a5 5 0 1 1 8 0" />
        <path d="M17 18.5a9 9 0 1 0-10 0" />
      </svg>
    );
  },
);

export const BankCardIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M3.00488 2.99979H21.0049C21.5572 2.99979 22.0049 3.4475 22.0049 3.99979V19.9998C22.0049 20.5521 21.5572 20.9998 21.0049 20.9998H3.00488C2.4526 20.9998 2.00488 20.5521 2.00488 19.9998V3.99979C2.00488 3.4475 2.4526 2.99979 3.00488 2.99979ZM20.0049 10.9998H4.00488V18.9998H20.0049V10.9998ZM20.0049 8.99979V4.99979H4.00488V8.99979H20.0049ZM14.0049 14.9998H18.0049V16.9998H14.0049V14.9998Z" />
      </svg>
    );
  },
);

export const ProjectIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM11.126 12H4V19H20V12H18.874C18.4299 13.7252 16.8638 15 15 15C13.1362 15 11.5701 13.7252 11.126 12ZM11.126 10C11.5701 8.27477 13.1362 7 15 7C16.8638 7 18.4299 8.27477 18.874 10H20V5H4V10H11.126ZM15 13C16.1046 13 17 12.1046 17 11C17 9.89543 16.1046 9 15 9C13.8954 9 13 9.89543 13 11C13 12.1046 13.8954 13 15 13ZM6 15H8V17H6V15Z" />
      </svg>
    );
  },
);

export const PlugIcon = React.forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      ref={forwardedRef}
    >
      <path d="M7 5C7 2.79086 8.79086 1 11 1C13.2091 1 15 2.79086 15 5H18C18.5523 5 19 5.44772 19 6V9C21.2091 9 23 10.7909 23 13C23 15.2091 21.2091 17 19 17V20C19 20.5523 18.5523 21 18 21H4C3.44772 21 3 20.5523 3 20V6C3 5.44772 3.44772 5 4 5H7ZM11 3C9.89543 3 9 3.89543 9 5C9 5.23554 9.0403 5.45952 9.11355 5.66675C9.22172 5.97282 9.17461 6.31235 8.98718 6.57739C8.79974 6.84243 8.49532 7 8.17071 7H5V19H17V15.8293C17 15.5047 17.1576 15.2003 17.4226 15.0128C17.6877 14.8254 18.0272 14.7783 18.3332 14.8865C18.5405 14.9597 18.7645 15 19 15C20.1046 15 21 14.1046 21 13C21 11.8954 20.1046 11 19 11C18.7645 11 18.5405 11.0403 18.3332 11.1135C18.0272 11.2217 17.6877 11.1746 17.4226 10.9872C17.1576 10.7997 17 10.4953 17 10.1707V7H13.8293C13.5047 7 13.2003 6.84243 13.0128 6.57739C12.8254 6.31235 12.7783 5.97282 12.8865 5.66675C12.9597 5.45952 13 5.23555 13 5C13 3.89543 12.1046 3 11 3Z" />
    </svg>
  );
});

export const KeyIcon = React.forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      ref={forwardedRef}
    >
      <path d="M10.7577 11.8281L18.6066 3.97919L20.0208 5.3934L18.6066 6.80761L21.0815 9.28249L19.6673 10.6967L17.1924 8.22183L15.7782 9.63604L17.8995 11.7574L16.4853 13.1716L14.364 11.0503L12.1719 13.2423C13.4581 15.1837 13.246 17.8251 11.5355 19.5355C9.58291 21.4882 6.41709 21.4882 4.46447 19.5355C2.51184 17.5829 2.51184 14.4171 4.46447 12.4645C6.17493 10.754 8.81633 10.5419 10.7577 11.8281ZM10.1213 18.1213C11.2929 16.9497 11.2929 15.0503 10.1213 13.8787C8.94975 12.7071 7.05025 12.7071 5.87868 13.8787C4.70711 15.0503 4.70711 16.9497 5.87868 18.1213C7.05025 19.2929 8.94975 19.2929 10.1213 18.1213Z" />
    </svg>
  );
});

export const ArrowRightIcon2 = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12 13H4V11H12V4L20 12L12 20V13Z" />
      </svg>
    );
  },
);

export const DisconnectIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M17 17H22V19H19V22H17V17ZM7 7H2V5H5V2H7V7ZM18.364 15.5355L16.9497 14.1213L18.364 12.7071C20.3166 10.7545 20.3166 7.58866 18.364 5.63604C16.4113 3.68342 13.2455 3.68342 11.2929 5.63604L9.87868 7.05025L8.46447 5.63604L9.87868 4.22183C12.6123 1.48816 17.0445 1.48816 19.7782 4.22183C22.5118 6.9555 22.5118 11.3877 19.7782 14.1213L18.364 15.5355ZM15.5355 18.364L14.1213 19.7782C11.3877 22.5118 6.9555 22.5118 4.22183 19.7782C1.48816 17.0445 1.48816 12.6123 4.22183 9.87868L5.63604 8.46447L7.05025 9.87868L5.63604 11.2929C3.68342 13.2455 3.68342 16.4113 5.63604 18.364C7.58866 20.3166 10.7545 20.3166 12.7071 18.364L14.1213 16.9497L15.5355 18.364ZM14.8284 7.75736L16.2426 9.17157L9.17157 16.2426L7.75736 14.8284L14.8284 7.75736Z" />
      </svg>
    );
  },
);

export const ConnectIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M18.3638 15.5355L16.9496 14.1213L18.3638 12.7071C20.3164 10.7545 20.3164 7.58866 18.3638 5.63604C16.4112 3.68341 13.2453 3.68341 11.2927 5.63604L9.87849 7.05025L8.46428 5.63604L9.87849 4.22182C12.6122 1.48815 17.0443 1.48815 19.778 4.22182C22.5117 6.95549 22.5117 11.3876 19.778 14.1213L18.3638 15.5355ZM15.5353 18.364L14.1211 19.7782C11.3875 22.5118 6.95531 22.5118 4.22164 19.7782C1.48797 17.0445 1.48797 12.6123 4.22164 9.87868L5.63585 8.46446L7.05007 9.87868L5.63585 11.2929C3.68323 13.2455 3.68323 16.4113 5.63585 18.364C7.58847 20.3166 10.7543 20.3166 12.7069 18.364L14.1211 16.9497L15.5353 18.364ZM14.8282 7.75736L16.2425 9.17157L9.17139 16.2426L7.75717 14.8284L14.8282 7.75736Z" />
      </svg>
    );
  },
);

export const SalesforceIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 210 155"
        {...props}
        ref={forwardedRef}
      >
        <g fillRule="evenodd" clipRule="evenodd">
          <path
            fill="#00A1E0"
            d="M86.853 24.393c6.73-7.03 16.104-11.397 26.467-11.397 13.776 0 25.798 7.706 32.199 19.146a44.384 44.384 0 0 1 18.201-3.88c24.849 0 44.99 20.38 44.99 45.523 0 25.143-20.141 45.523-44.99 45.523-3.038 0-6.001-.305-8.865-.884-5.636 10.08-16.383 16.893-28.711 16.893a32.553 32.553 0 0 1-14.387-3.322c-5.716 13.484-19.03 22.935-34.545 22.935-16.157 0-29.93-10.256-35.214-24.636-2.355.499-4.754.75-7.16.749C15.597 131.045 0 115.24 0 95.742a35.433 35.433 0 0 1 4.643-17.62 35.302 35.302 0 0 1 12.776-12.959 40.535 40.535 0 0 1-3.333-16.146c0-22.427 18.15-40.604 40.537-40.604a40.373 40.373 0 0 1 17.982 4.203 40.496 40.496 0 0 1 14.248 11.777Z"
          />
          <path
            fill="#fff"
            d="m30.23 84.395.845-2.35c.135-.404.439-.271.562-.195.235.14.404.265.707.444a10.104 10.104 0 0 0 5.513 1.593c1.863 0 3.018-.989 3.018-2.324v-.068c0-1.452-1.78-2.001-3.837-2.633l-.457-.147c-2.824-.805-5.843-1.97-5.843-5.556v-.073c0-3.402 2.736-5.776 6.653-5.776l.43-.005c2.3 0 4.524.671 6.135 1.651.146.092.288.261.206.485l-.868 2.352c-.153.4-.57.135-.57.135a12.32 12.32 0 0 0-5.438-1.4c-1.661 0-2.73.884-2.73 2.084v.076c0 1.398 1.831 1.996 3.954 2.69l.365.114c2.815.893 5.819 2.13 5.819 5.529v.07c0 3.675-2.662 5.958-6.942 5.958-2.102 0-4.113-.326-6.24-1.459-.402-.233-.8-.435-1.192-.72-.041-.06-.221-.131-.091-.475h.002Zm62.674 0 .847-2.35c.123-.386.482-.244.56-.195.232.144.406.265.707.444a10.118 10.118 0 0 0 5.519 1.593c1.856 0 3.014-.989 3.014-2.324v-.068c0-1.452-1.779-2.001-3.835-2.633l-.457-.147c-2.828-.805-5.848-1.97-5.848-5.556v-.073c0-3.402 2.74-5.776 6.656-5.776l.427-.005c2.301 0 4.527.671 6.14 1.651.142.092.286.261.206.485-.08.209-.792 2.132-.868 2.352-.157.4-.57.135-.57.135a12.323 12.323 0 0 0-5.44-1.4c-1.662 0-2.73.884-2.73 2.084v.076c0 1.398 1.829 1.996 3.954 2.69l.365.114c2.814.893 5.816 2.13 5.816 5.529v.07c0 3.675-2.659 5.958-6.939 5.958-2.105 0-4.116-.326-6.24-1.459-.403-.233-.8-.435-1.195-.72-.04-.06-.221-.131-.089-.475Zm46.36-11.055c.352 1.181.525 2.48.525 3.85 0 1.374-.173 2.668-.525 3.85a8.64 8.64 0 0 1-1.62 3.115 7.729 7.729 0 0 1-2.749 2.074c-1.095.504-2.383.755-3.83.755s-2.739-.251-3.83-.755a7.725 7.725 0 0 1-2.748-2.074 8.678 8.678 0 0 1-1.623-3.114 13.55 13.55 0 0 1-.525-3.85c0-1.374.175-2.67.525-3.85.351-1.191.897-2.24 1.62-3.114a7.863 7.863 0 0 1 2.751-2.093c1.093-.513 2.378-.771 3.83-.771s2.737.258 3.83.771c1.091.51 2.018 1.213 2.749 2.093.725.874 1.273 1.923 1.62 3.113Zm-3.57 3.85c0-2.076-.383-3.708-1.146-4.853-.753-1.135-1.894-1.685-3.483-1.685-1.589 0-2.721.55-3.465 1.685-.746 1.145-1.128 2.777-1.128 4.854 0 2.074.382 3.718 1.133 4.871.739 1.15 1.871 1.706 3.46 1.706s2.73-.559 3.483-1.706c.758-1.153 1.146-2.797 1.146-4.871Zm32.92 6.022.877 2.43a.33.33 0 0 1-.144.429c-1.354.527-3.232.902-5.061.902-3.1 0-5.474-.895-7.058-2.662-1.575-1.763-2.378-4.16-2.378-7.134 0-1.376.198-2.678.587-3.858.388-1.19.97-2.239 1.737-3.113a8.24 8.24 0 0 1 2.878-2.092c1.141-.51 2.483-.767 3.981-.767 1.011 0 1.91.062 2.682.176.824.128 1.922.426 2.385.607.085.032.32.146.224.423-.338.955-.568 1.578-.881 2.447-.137.371-.416.248-.416.248-1.175-.371-2.303-.54-3.775-.54-1.769 0-3.098.59-3.965 1.746-.876 1.165-1.367 2.692-1.374 4.723-.007 2.227.55 3.878 1.536 4.9.984 1.018 2.358 1.533 4.088 1.533a12.7 12.7 0 0 0 1.959-.14c.589-.094 1.141-.277 1.661-.48 0 0 .336-.126.457.222Zm18.284-10.547c.778 2.733.372 5.093.358 5.224-.03.311-.349.316-.349.316l-12.096-.01c.076 1.844.516 3.149 1.406 4.035.875.867 2.262 1.423 4.141 1.426 2.872.007 4.097-.573 4.967-.895 0 0 .331-.12.457.21l.787 2.223c.16.373.032.504-.103.58-.758.418-2.595 1.201-6.092 1.21-1.696.007-3.173-.235-4.389-.71a7.985 7.985 0 0 1-3.043-2.02 8.003 8.003 0 0 1-1.755-3.084 13.09 13.09 0 0 1-.546-3.874c0-1.374.176-2.678.53-3.871.353-1.202.903-2.262 1.636-3.153a7.954 7.954 0 0 1 2.787-2.129c1.11-.524 2.484-.78 3.995-.78 1.294 0 2.476.279 3.46.705.758.325 1.52.913 2.301 1.756.493.53 1.244 1.694 1.548 2.84Zm-12.03 2.534h8.629c-.089-1.113-.306-2.11-.804-2.862-.758-1.135-1.803-1.76-3.39-1.76-1.588 0-2.716.625-3.462 1.76-.489.751-.801 1.708-.973 2.862Zm-84.856-2.534c.776 2.733.377 5.093.363 5.224-.032.311-.351.316-.351.316l-12.098-.01c.078 1.844.516 3.149 1.408 4.035.875.867 2.26 1.423 4.139 1.426 2.871.007 4.102-.573 4.969-.895 0 0 .33-.12.454.21l.79 2.223c.16.373.032.504-.1.58-.763.418-2.603 1.201-6.095 1.21-1.698.007-3.175-.235-4.39-.71a8.019 8.019 0 0 1-3.044-2.02 8.032 8.032 0 0 1-1.751-3.084 13.042 13.042 0 0 1-.55-3.874c0-1.374.178-2.678.53-3.871a8.892 8.892 0 0 1 1.638-3.153 7.965 7.965 0 0 1 2.785-2.129c1.114-.524 2.488-.78 3.995-.78a8.765 8.765 0 0 1 3.465.705c.757.325 1.52.913 2.298 1.756.493.53 1.244 1.694 1.545 2.84Zm-12.031 2.534h8.633c-.092-1.113-.309-2.11-.804-2.862-.753-1.135-1.803-1.76-3.39-1.76-1.588 0-2.718.625-3.46 1.76-.493.751-.803 1.708-.98 2.862Zm-21.333-.58s.954.085 1.994.237v-.513c0-1.619-.335-2.381-.995-2.892-.675-.517-1.684-.785-2.99-.785 0 0-2.944-.037-5.273 1.232-.107.064-.196.1-.196.1s-.292.104-.397-.196l-.856-2.308c-.133-.332.107-.483.107-.483 1.089-.852 3.727-1.367 3.727-1.367a19.821 19.821 0 0 1 3.244-.3c2.415 0 4.285.564 5.556 1.678 1.274 1.12 1.922 2.924 1.922 5.355l.007 11.099s.025.32-.279.394c0 0-.445.123-.844.217a70.48 70.48 0 0 1-3.05.593 22.173 22.173 0 0 1-3.675.307c-1.175 0-2.253-.11-3.202-.328a6.656 6.656 0 0 1-2.463-1.071 5.014 5.014 0 0 1-1.575-1.898c-.372-.762-.56-1.694-.56-2.77 0-1.055.222-1.996.649-2.797a5.843 5.843 0 0 1 1.757-2.001 7.808 7.808 0 0 1 2.523-1.175 11.554 11.554 0 0 1 2.98-.382c.76 0 1.395.016 1.889.055Zm-4.815 8.526c-.006-.002 1.085.859 3.548.708a24.628 24.628 0 0 0 3.264-.435V77.9s-1.548-.254-3.285-.279c-2.463-.03-3.513.88-3.506.877-.726.517-1.08 1.284-1.08 2.346 0 .68.121 1.212.365 1.582.153.245.22.337.694.72ZM154.22 68.368c-.114.332-.701 1.994-.913 2.545-.078.211-.206.355-.441.33 0 0-.694-.16-1.328-.16-.436 0-1.059.055-1.621.229a3.625 3.625 0 0 0-1.493.9c-.442.428-.801 1.03-1.061 1.785-.265.76-.402 1.969-.402 3.182v9.038a.377.377 0 0 1-.106.261.36.36 0 0 1-.259.108h-3.175a.367.367 0 0 1-.374-.366V68.123c0-.204.148-.367.351-.367h3.098c.205 0 .351.163.351.367v1.479c.463-.623 1.294-1.172 2.045-1.511.754-.344 1.596-.595 3.118-.504.792.048 1.822.266 2.03.346a.33.33 0 0 1 .18.435Zm-29.834-8.386c.085.034.315.146.224.421l-.929 2.548c-.078.193-.128.307-.523.188a5.43 5.43 0 0 0-1.614-.252c-.479 0-.913.062-1.296.19a2.474 2.474 0 0 0-1.014.627 3.54 3.54 0 0 0-.849 1.296c-.445 1.282-.616 2.649-.639 2.736h3.867c.326 0 .429.15.397.391l-.452 2.523c-.073.366-.404.353-.404.353h-3.985l-2.724 15.466a23.967 23.967 0 0 1-1.063 4.075c-.427 1.12-.868 1.937-1.575 2.718a5.546 5.546 0 0 1-2.235 1.561c-.838.31-1.856.467-2.967.467-.53 0-1.101-.011-1.774-.172a9.54 9.54 0 0 1-1.107-.325c-.148-.052-.269-.242-.183-.485.083-.24.799-2.207.895-2.466.123-.31.438-.192.438-.192.215.092.366.151.651.208a5.5 5.5 0 0 0 .972.108c.528 0 1.007-.064 1.425-.206.502-.163.799-.458 1.105-.852.319-.414.579-.975.846-1.728.267-.762.512-1.77.722-2.99l2.711-15.185h-2.67c-.32 0-.429-.151-.393-.394l.448-2.523c.07-.366.41-.352.41-.352h2.742l.148-.82c.411-2.436 1.226-4.288 2.431-5.503 1.212-1.225 2.936-1.843 5.122-1.843.626 0 1.178.041 1.646.126.459.087.808.167 1.196.286ZM70.343 86.218c0 .206-.141.368-.347.368H66.79c-.205 0-.345-.165-.345-.366v-25.9c0-.199.142-.363.343-.363h3.21c.205 0 .346.164.346.366v25.895Z"
          />
        </g>
      </svg>
    );
  },
);

export const SegmentTwilioIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 300 154"
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="#121C2D"
          d="M82.378 100.153v-6.886c4.274 3.087 9.102 4.63 13.594 4.63 3.601 0 5.758-1.602 5.758-4.946 0-3.344-2.929-3.918-7.044-4.571-7.302-1.227-12.803-2.513-12.803-10.705 0-8.191 5.462-12.03 13.693-12.03 5.362 0 10.19 1.543 12.763 3.245v6.589c-3.601-2.474-8.588-3.76-12.921-3.76-3.542 0-5.917 1.603-5.917 4.888 0 3.284 2.672 3.957 6.847 4.63 7.103 1.187 13.02 2.632 13.02 10.546 0 7.915-5.303 12.347-13.277 12.347-5.917 0-10.349-1.701-13.693-3.957l-.02-.02Zm30.314-10.645v-.712c0-8.805 5.758-14.405 13.317-14.405 7.558 0 12.762 4.63 12.762 13.791v2.988h-18.619c.316 4.571 3.759 7.104 9.26 7.104 2.889 0 5.6-.713 8.231-1.9v5.501c-2.156 1.128-5.402 2.256-9.873 2.256-9.201 0-15.078-4.888-15.078-14.603v-.02Zm7.361-2.889h11.516c-.258-4.69-2.315-7.004-5.6-7.004-3.601 0-5.6 2.77-5.916 7.004Zm20.202 22.736c0-2.573 2.315-4.69 7.559-5.857-4.314-.574-5.818-2.256-5.818-4.175 0-2.414 1.9-4.433 6.748-5.66-4.274-1.345-6.53-4.57-6.53-8.646 0-6.431 5.659-9.933 12.149-9.933h15.493v5.757h-4.729c.831 1.089 1.286 2.632 1.286 3.958 0 5.976-5.144 9.616-12.09 9.616h-1.187c-1.86 0-4.274.831-4.274 2.316 0 .93.93 1.345 3.542 1.345h7.302c6.232 0 9.774 1.8 9.774 6.688 0 5.916-5.56 9.874-16.265 9.874h-1.602c-4.888 0-11.378-1.128-11.378-5.303l.02.02Zm21.924-3.087c0-1.9-1.642-2.375-4.571-2.375h-4.056c-3.542 0-5.976 1.385-5.976 3.285 0 1.9 2.315 2.513 5.6 2.513h1.741c4.432 0 7.262-1.227 7.262-3.443v.02Zm-2.77-21.45c0-2.928-1.544-5.144-5.046-5.144-3.502 0-5.046 2.216-5.046 5.204 0 2.988 1.544 5.204 5.046 5.204 3.502 0 5.046-2.414 5.046-5.243v-.02Zm13.851-9.715h7.202v6.273c2.256-4.116 5.462-7.045 10.032-7.045 4.274 0 6.847 2.929 7.361 7.104 2.315-4.314 5.501-7.104 9.933-7.104 5.145 0 8.232 3.245 8.232 10.23v18.837h-7.519V86.481c0-4.017-1.385-6.174-4.571-6.174-2.157 0-3.7 1.286-4.571 2.77-.673.97-.93 2.315-.93 3.542l-.099 16.779h-7.4V86.579c0-4.372-1.445-6.272-4.571-6.272-2.315 0-3.76 1.286-4.63 2.77-.614.97-.93 2.256-.93 3.542v16.779h-7.519V75.103h-.02Zm47.133 14.405v-.712c0-8.805 5.758-14.405 13.316-14.405 7.559 0 12.763 4.63 12.763 13.791v2.988h-18.62c.317 4.571 3.76 7.104 9.261 7.104 2.888 0 5.599-.713 8.231-1.9v5.501c-2.157 1.128-5.402 2.256-9.874 2.256-9.201 0-15.077-4.888-15.077-14.603v-.02Zm7.36-2.889h11.516c-.257-4.69-2.315-7.004-5.599-7.004-3.602 0-5.6 2.77-5.917 7.004Zm23.467-11.516h7.203v6.431c2.156-4.274 5.402-7.143 10.19-7.143 5.303 0 8.231 3.403 8.231 10.29v18.718h-7.519V86.362c0-3.8-1.543-5.916-4.729-5.916-2.157 0-3.858 1.088-4.788 2.73-.713 1.03-1.089 2.216-1.089 3.602v16.621H251.2V75.103h.02Zm33.777 20.223V80.86h-5.204V75.4l2.117-.06c1.86 0 3.344-.672 3.542-3.7l.455-5.5h6.688v8.943h7.361v5.758h-7.46v13.317c0 2.889 1.543 4.017 4.274 4.017.871 0 2.157-.159 2.829-.356v5.144c-1.088.455-3.344 1.029-5.758 1.029-6.331 0-8.844-2.73-8.844-8.686v.02ZM85.98 47.52h-3.225v-2.454h9.458v2.454h-3.285v9.419H85.98V47.52Zm9.082-2.454h3.008l1.8 8.924 1.821-8.943h3.581l1.82 8.983 1.742-8.964h3.007l-2.572 11.892h-3.957l-1.86-8.547-1.781 8.547h-3.997l-2.592-11.892h-.02Zm20.242 0h2.928V56.94h-2.928V45.066Zm7.381 0h2.928v9.221h4.828v2.632h-7.756V45.067Zm11.258 0h2.929V56.94h-2.929V45.066Zm6.807 6.056v-.238c0-3.799 2.157-6.055 5.481-6.055s5.422 2.276 5.422 6.055v.238c0 3.799-2.157 6.054-5.461 6.054-3.305 0-5.462-2.216-5.462-6.054h.02Zm7.875-.06v-.118c0-2.652-.91-3.76-2.394-3.76s-2.453 1.088-2.453 3.76v.118c0 2.73.93 3.76 2.453 3.76 1.524 0 2.394-1.108 2.394-3.76Z"
        />
        <path
          fill="#25C365"
          d="M57.308 62.539H25.886a2.097 2.097 0 0 0-2.097 2.097v3.72c0 1.158.939 2.097 2.097 2.097h31.422a2.097 2.097 0 0 0 2.097-2.097v-3.72a2.097 2.097 0 0 0-2.097-2.097ZM33.564 78.368H2.142a2.097 2.097 0 0 0-2.098 2.098v3.72c0 1.158.94 2.097 2.098 2.097h31.422c1.158 0 2.097-.94 2.097-2.097v-3.72a2.097 2.097 0 0 0-2.097-2.098Zm-21.647 21.766a3.957 3.957 0 1 0 0-7.915 3.957 3.957 0 0 0 0 7.915Zm35.616-43.532a3.957 3.957 0 1 0 0-7.914 3.957 3.957 0 0 0 0 7.914ZM29.725 98.155c-2.216 0-4.373-.317-6.411-.91-.97-.277-1.999.277-2.355 1.226l-1.346 3.72a1.988 1.988 0 0 0 1.326 2.592 31.405 31.405 0 0 0 8.786 1.267c12.92 0 23.981-7.757 28.908-18.837.475-1.069-.02-2.315-1.127-2.711l-3.72-1.365c-.95-.357-2.038.079-2.454.989-3.72 8.231-12.01 13.99-21.607 13.99v.039Zm0-47.489c2.216 0 4.373.317 6.41.91.97.277 2-.276 2.355-1.226l1.346-3.72a1.989 1.989 0 0 0-1.326-2.592 31.434 31.434 0 0 0-8.785-1.267C16.804 42.751 5.743 50.508.816 61.59c-.475 1.068.02 2.315 1.128 2.71l3.72 1.366c.95.356 2.038-.08 2.453-.99 3.72-8.23 12.011-13.989 21.608-13.989v-.02Z"
        />
      </svg>
    );
  },
);

export const HubspotIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 216 154"
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="#213343"
          d="M23.785 76.526H7.997v16.632H.5V52.121h7.497v17.192h15.788V52.122h7.495v41.035h-7.495v-16.63Zm31.484 3.368c0 3.417-2.784 6.198-6.201 6.198-3.418 0-6.2-2.78-6.2-6.198V62.318h-7.1v17.576c0 7.332 5.967 13.297 13.3 13.297 7.331 0 13.297-5.965 13.297-13.297V62.318H55.27v17.576Zm52.678-15.766c0-3.604 2.385-4.747 4.996-4.747 2.103 0 4.885 1.6 6.7 3.545l4.656-5.488c-2.326-3.143-7.039-5.316-10.901-5.316-7.724 0-13.29 4.516-13.29 12.006 0 13.89 16.981 9.487 16.981 17.264 0 2.398-2.327 4.515-4.996 4.515-4.203 0-5.567-2.058-7.497-4.23l-5.169 5.372c3.296 4.06 7.383 6.118 12.268 6.118 7.326 0 13.232-4.573 13.232-11.72 0-15.434-16.98-10.632-16.98-17.32Zm105.052 22.474c-4.201 0-5.393-1.816-5.393-4.6V69.679h6.529v-6.246h-6.529v-8.236l-7.21 3.237v25.102c0 6.418 4.427 9.655 10.502 9.655.908 0 2.159-.059 2.841-.227l1.761-6.474a37.94 37.94 0 0 1-2.501.112ZM82.329 62.523c-3.522 0-5.98 1.023-8.353 3.353v-13.51h-7.122v25.037c0 9.37 6.775 15.788 14.387 15.788 8.462 0 15.876-6.532 15.876-15.333 0-8.69-6.837-15.335-14.788-15.335Zm-.045 23.5a8.077 8.077 0 1 1 0-16.154 8.077 8.077 0 0 1 0 16.155Zm77.364-8.535c0-8.8-7.414-15.333-15.876-15.333-7.613 0-14.388 6.418-14.388 15.789v25.035h7.122V89.471c2.374 2.33 4.832 3.352 8.353 3.352 7.952 0 14.789-6.645 14.789-15.335Zm-6.756-.088a8.077 8.077 0 1 1-16.155 0 8.077 8.077 0 1 1 16.155 0Z"
        />
        <path
          fill="#FF5C35"
          d="M182.661 61.81v-7.154c1.867-.882 3.175-2.771 3.175-4.963v-.166c0-3.025-2.475-5.5-5.501-5.5h-.165c-3.026 0-5.501 2.475-5.501 5.5v.166c0 2.192 1.308 4.081 3.176 4.963v7.154a15.6 15.6 0 0 0-7.417 3.264l-19.642-15.28c.13-.497.22-1.01.221-1.548a6.205 6.205 0 1 0-6.213 6.197c1.117.002 2.151-.316 3.057-.83l19.321 15.03a15.608 15.608 0 0 0-2.605 8.65 15.6 15.6 0 0 0 2.845 8.993l-5.876 5.876a5.04 5.04 0 0 0-1.457-.237 5.099 5.099 0 1 0 5.099 5.099c0-.51-.097-.993-.237-1.457l5.813-5.812a15.595 15.595 0 0 0 9.499 3.224c8.663 0 15.686-7.023 15.686-15.687 0-7.842-5.761-14.32-13.278-15.482Zm-2.408 23.525a8.043 8.043 0 1 1-.001-16.086 8.043 8.043 0 0 1 .001 16.086Z"
        />
      </svg>
    );
  },
);

export const UsertourIcon2 = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        fill="none"
        viewBox="0 0 512 512"
        {...props}
        ref={forwardedRef}
      >
        <defs>
          <clipPath id="master_svg0_5_12">
            <rect x="0" y="0" width="512" height="512" rx="0" />
          </clipPath>
        </defs>
        <g clipPath="url(#master_svg0_5_12)">
          <g>
            <path
              d="M0,117.35C0,117.35,142.65,481.15,142.65,481.15C142.65,481.15,158.45,81.75,158.45,81.75C158.45,81.75,0,117.35,0,117.35C0,117.35,0,117.35,0,117.35Z"
              fill="currentColor"
              fillOpacity="1"
            />
          </g>
          <g>
            <path
              d="M194.64834594726562,74.9C194.64834594726562,74.9,147.64834594726562,481.7,147.64834594726562,481.7C147.64834594726562,481.7,511.99834594726565,0,511.99834594726565,0C511.99834594726565,0,194.64834594726562,74.9,194.64834594726562,74.9C194.64834594726562,74.9,194.64834594726562,74.9,194.64834594726562,74.9Z"
              fill="currentColor"
              fillOpacity="1"
            />
          </g>
        </g>
      </svg>
    );
  },
);

export const ArrowRightLeftIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M7.44975 7.05029L2.5 12L7.44727 16.9473L8.86148 15.5331L6.32843 13H17.6708L15.1358 15.535L16.55 16.9493L21.5 11.9996L16.5503 7.0498L15.136 8.46402L17.6721 11H6.32843L8.86396 8.46451L7.44975 7.05029Z" />
      </svg>
    );
  },
);

export const EqualIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M19 8H5V10H19V8ZM19 14H5V16H19V14Z" />
      </svg>
    );
  },
);

export const ArrowLeftIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M7.82843 10.9999H20V12.9999H7.82843L13.1924 18.3638L11.7782 19.778L4 11.9999L11.7782 4.22168L13.1924 5.63589L7.82843 10.9999Z" />
      </svg>
    );
  },
);

export const SuccessIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM17.4571 9.45711L11 15.9142L6.79289 11.7071L8.20711 10.2929L11 13.0858L16.0429 8.04289L17.4571 9.45711Z" />
      </svg>
    );
  },
);

export const WarningIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM11 15V17H13V15H11ZM11 7V13H13V7H11Z" />
      </svg>
    );
  },
);

export const ErrorIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 10.5858L9.17157 7.75736L7.75736 9.17157L10.5858 12L7.75736 14.8284L9.17157 16.2426L12 13.4142L14.8284 16.2426L16.2426 14.8284L13.4142 12L16.2426 9.17157L14.8284 7.75736L12 10.5858Z" />
      </svg>
    );
  },
);

export const ClickIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1024 1024"
        fill="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path d="M821.248 422.912h-2.048c-14.848 0-28.672 3.072-42.496 10.24-15.872-35.84-49.664-58.368-88.064-58.368-15.36 0-30.72 3.584-44.544 10.24-15.872-35.84-49.664-58.368-88.064-58.368-12.288 0-24.064 2.048-35.328 6.144V253.952c0-55.808-42.496-99.328-96.768-99.328-55.296 0-99.84 44.544-99.84 99.328v333.824l-41.984-41.472c-39.936-39.424-108.544-32.768-141.312 0-31.744 31.744-55.296 98.816-6.656 146.944l256 254.464c5.12 5.12 11.264 10.24 18.432 14.336 46.08 37.376 100.864 61.952 218.112 61.952 268.288 0 290.304-151.04 290.304-319.488V522.24c0.512-55.296-41.984-99.328-95.744-99.328zM243.712 598.528l91.648 91.136c19.968 19.968 53.76 5.632 53.76-22.528V263.68c0-19.456 15.872-34.816 35.328-34.816 18.432 0 32.256 14.848 32.256 34.816v296.96c0 17.92 14.336 32.256 32.256 32.256 16.896 0 30.208-12.8 32.256-28.672v-128c0-19.968 14.336-34.816 33.28-34.816 0.512 0 15.36 0 25.088 9.728 6.144 5.632 8.704 14.336 8.704 25.088V599.04c0 17.92 14.336 32.256 32.256 32.256 16.896 0 30.208-12.8 32.256-28.672V484.352c0-19.968 14.336-34.816 32.256-34.816 34.816 2.56 35.84 31.744 35.84 34.816v143.36c0 17.92 14.336 32.256 32.256 32.256 16.896 0 29.696-12.288 31.744-28.672v-102.912c0-19.456 14.848-34.816 33.792-34.816 0 0 14.848-0.512 24.576 9.216 6.144 5.632 9.216 14.336 9.216 26.112v176.128c0 142.848 0 255.488-225.792 255.488-93.184 0-152.064-19.456-197.632-64.512l-242.176-240.64c-8.192-8.192-12.288-17.92-11.264-28.16 0.512-9.216 5.12-18.944 12.8-26.624s18.432-11.264 28.672-11.264c10.24-1.024 19.968 2.56 26.624 9.216z" />
        <path d="M219.648 274.944c17.408-2.56 30.208-17.92 30.208-35.84 0.512-92.672 75.776-168.448 168.96-168.448s168.448 75.264 168.96 168.448c0 17.408 12.8 33.28 30.208 35.84 22.016 3.072 40.448-13.824 40.448-34.816C658.432 107.52 550.912 0 418.816 0S179.2 107.52 179.2 239.616c0 21.504 18.432 38.4 40.448 35.328z" />
      </svg>
    );
  },
);
