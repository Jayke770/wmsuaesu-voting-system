const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false, 
  showClass: {
    popup: 'animate__animated animate__fadeInRight ms-300'
  },
  hideClass: {
    popup: 'animate__animated animate__fadeOutRight ms-300'
  }
})