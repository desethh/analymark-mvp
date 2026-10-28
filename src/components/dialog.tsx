'use client';
import {useEffect,useRef,type ReactNode} from 'react';

/** Native dialog provides focus containment, Escape and background inertness. */
export function Dialog({children,onClose,labelledBy}:{children:ReactNode;onClose:()=>void;labelledBy:string}){
 const ref=useRef<HTMLDialogElement>(null),close=useRef(onClose);
 close.current=onClose;
 useEffect(()=>{
  const dialog=ref.current!;
  const previous=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;
  dialog.showModal();document.body.style.overflow='hidden';
  dialog.querySelector<HTMLInputElement>('input')?.focus();
  return()=>{dialog.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
 },[]);
 return <dialog ref={ref} className="modal" aria-labelledby={labelledBy} onCancel={e=>{e.preventDefault();close.current();}} onClick={e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close.current();}}>{children}</dialog>;
}
